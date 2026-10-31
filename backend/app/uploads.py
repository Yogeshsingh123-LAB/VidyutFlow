"""Upload size enforcement and document filename / reference sanitising."""
from pathlib import PurePosixPath
import re
import unicodedata
from urllib.parse import unquote
from fastapi import HTTPException, UploadFile

ALLOWED_DOCUMENT_EXTENSIONS = frozenset({".pdf", ".jpg", ".jpeg", ".png", ".txt"})
MAX_DOCUMENT_NAME_LEN = 120
MULTIPART_OVERHEAD_BYTES = 65_536
_READ_CHUNK_BYTES = 65_536

_BINARY_DISGUISE_HEADERS = (
    b"MZ",              # Windows PE / DOS executable
    b"\x7fELF",         # Linux ELF binary
    b"\xca\xfe\xba\xbe",# Mach-O / Java class
    b"\xfe\xed\xfa\xce",# Mach-O 32-bit
    b"\xfe\xed\xfa\xcf",# Mach-O 64-bit
    b"\xcf\xfa\xed\xfe",# Mach-O 64-bit LE
    b"PK\x03\x04",      # ZIP / JAR / APK / DOCX archive
    b"Rar!\x1a\x07",    # RAR archive
    b"%PDF-",           # PDF disguised as .txt
    b"\x89PNG\r\n\x1a\n",
    b"\xff\xd8\xff",
)


def validate_magic_bytes(clean_name: str, data: bytes) -> None:
    """Enforce magic-byte file signature checks matching `clean_name`'s extension."""
    ext = PurePosixPath(clean_name).suffix.lower()
    if ext == ".pdf":
        if not data.startswith(b"%PDF-"):
            raise HTTPException(
                400,
                "Invalid PDF file signature: uploaded content does not start with %PDF- magic bytes",
            )
    elif ext == ".png":
        if not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise HTTPException(
                400,
                "Invalid PNG file signature: uploaded content does not match PNG magic bytes",
            )
    elif ext in {".jpg", ".jpeg"}:
        if not data.startswith(b"\xff\xd8\xff"):
            raise HTTPException(
                400,
                "Invalid JPEG file signature: uploaded content does not match JPEG FF D8 FF magic bytes",
            )
    elif ext == ".txt":
        if b"\x00" in data or any(data.startswith(sig) for sig in _BINARY_DISGUISE_HEADERS):
            raise HTTPException(
                400,
                "Invalid text document: binary or executable signature detected in .txt upload",
            )
        try:
            data.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise HTTPException(
                400,
                "Invalid text document: .txt uploads must be valid UTF-8 text",
            ) from exc
    else:
        raise HTTPException(400, f"Unsupported document file type: {ext}")

_UNSAFE_STEM_RE = re.compile(r"[^A-Za-z0-9_-]+")
_UNSAFE_REF_RE = re.compile(r"[^A-Za-z0-9._(), -]+")
_MULTI_UNDERSCORE_RE = re.compile(r"_+")
_MULTI_SPACE_RE = re.compile(r"\s+")


def _has_forbidden_control_or_bidi(value: str) -> bool:
    for ch in value:
        code = ord(ch)
        if code < 32 or (0x7F <= code <= 0x9F) or unicodedata.category(ch) == "Cf":
            return True
    return False


def sanitize_uploaded_filename(raw_filename: str | None) -> str:
    """Validate and sanitize a multipart UploadFile filename into `<safe_stem><allowed_ext>`."""
    if raw_filename is None or not raw_filename.strip():
        raise HTTPException(400, "Uploaded document must have a valid filename")
    decoded_filename = unquote(raw_filename)
    if _has_forbidden_control_or_bidi(raw_filename) or _has_forbidden_control_or_bidi(decoded_filename):
        raise HTTPException(400, "Invalid control or formatting characters in document filename")

    basename = decoded_filename.replace("\\", "/").split("/")[-1].strip()
    if not basename or basename in {".", ".."}:
        raise HTTPException(400, "Invalid document filename")

    stripped_dots = basename.lstrip(".")
    if not stripped_dots:
        raise HTTPException(400, "Invalid document filename")

    path = PurePosixPath(stripped_dots)
    ext = path.suffix.lower()
    if not ext or ext not in ALLOWED_DOCUMENT_EXTENSIONS:
        allowed_list = ", ".join(sorted(ALLOWED_DOCUMENT_EXTENSIONS))
        raise HTTPException(400, f"Unsupported document file type; allowed: {allowed_list}")

    raw_stem = stripped_dots[: -len(path.suffix)]
    normalized_stem = unicodedata.normalize("NFKC", raw_stem).replace(".", "_")
    clean_stem = _UNSAFE_STEM_RE.sub("_", normalized_stem)
    clean_stem = _MULTI_UNDERSCORE_RE.sub("_", clean_stem).strip("_-")
    if not clean_stem or not any(ch.isalnum() for ch in clean_stem):
        raise HTTPException(400, "Document filename must contain alphanumeric characters")

    max_stem_len = MAX_DOCUMENT_NAME_LEN - len(ext)
    if len(clean_stem) > max_stem_len:
        clean_stem = clean_stem[:max_stem_len].rstrip("_-")
        if not clean_stem:
            raise HTTPException(400, "Invalid document filename")

    return f"{clean_stem}{ext}"


def sanitize_document_reference(raw_name: str) -> str:
    """Sanitize JSON `document_name` labels/filenames while preserving empty missing-doc semantics."""
    if not raw_name or not raw_name.strip():
        return ""
    decoded_name = unquote(raw_name)
    if _has_forbidden_control_or_bidi(raw_name) or _has_forbidden_control_or_bidi(decoded_name):
        raise HTTPException(400, "Invalid control or formatting characters in document_name")

    basename = decoded_name.replace("\\", "/").split("/")[-1].strip()
    if not basename or basename in {".", ".."}:
        raise HTTPException(400, "Invalid document_name")

    normalized = unicodedata.normalize("NFKC", basename)
    cleaned = _UNSAFE_REF_RE.sub("_", normalized)
    cleaned = _MULTI_SPACE_RE.sub(" ", cleaned)
    cleaned = _MULTI_UNDERSCORE_RE.sub("_", cleaned)
    cleaned = cleaned.lstrip("._=+-@ ").rstrip(". ")

    if not cleaned or not any(ch.isalnum() for ch in cleaned):
        raise HTTPException(400, "Invalid document_name")

    return cleaned[:MAX_DOCUMENT_NAME_LEN].rstrip(". ")


async def validate_and_read_upload(document: UploadFile, max_bytes: int) -> str:
    """Sanitize filename and enforce non-empty, max_bytes, and magic-byte signature before DB writes."""
    try:
        clean_name = sanitize_uploaded_filename(document.filename)
        buf = bytearray()
        while True:
            chunk = await document.read(_READ_CHUNK_BYTES)
            if not chunk:
                break
            buf.extend(chunk)
            if len(buf) > max_bytes:
                raise HTTPException(
                    413,
                    f"Uploaded document exceeds maximum allowed size of {max_bytes} bytes",
                )
        if not buf:
            raise HTTPException(400, "Uploaded document must not be empty")
        validate_magic_bytes(clean_name, bytes(buf))
        return clean_name
    finally:
        await document.close()


# ---------------------------------------------------------------------------
# Authenticated Envelope Encryption-at-Rest Helper (Item #21 — AES-256-GCM)
# ---------------------------------------------------------------------------
_ENC_MAGIC = b"VFENC1"


def _derive_aes256_key(master_secret: str, salt: bytes) -> bytes:
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF

    return HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        info=b"vidyutflow-upload-at-rest-v1",
    ).derive(master_secret.encode("utf-8"))


def encrypt_upload_at_rest(plaintext: bytes, master_secret: str, aad: bytes = b"") -> bytes:
    """Encrypt sensitive KYC / field photo bytes with HKDF-SHA256 + AES-256-GCM."""
    import os as _os
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    if not master_secret or len(master_secret) < 16:
        raise ValueError("Encryption master_secret must be at least 16 characters")
    salt = _os.urandom(16)
    nonce = _os.urandom(12)
    key = _derive_aes256_key(master_secret, salt)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, aad or None)
    return _ENC_MAGIC + salt + nonce + ciphertext


def decrypt_upload_at_rest(blob: bytes, master_secret: str, aad: bytes = b"") -> bytes:
    """Authenticate and decrypt a blob produced by `encrypt_upload_at_rest`."""
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    header_len = len(_ENC_MAGIC) + 16 + 12
    if len(blob) < header_len + 16 or not blob.startswith(_ENC_MAGIC):
        raise ValueError("Invalid or unrecognized encrypted document header")
    offset = len(_ENC_MAGIC)
    salt = blob[offset : offset + 16]
    nonce = blob[offset + 16 : offset + 28]
    ciphertext = blob[offset + 28 :]
    key = _derive_aes256_key(master_secret, salt)
    return AESGCM(key).decrypt(nonce, ciphertext, aad or None)


async def validate_and_encrypt_upload(
    document: UploadFile,
    max_bytes: int,
    master_secret: str,
    vault_dir: str | None = None,
) -> tuple[str, str]:
    """Validate upload, encrypt payload via HKDF-SHA256 + AES-256-GCM, and return (clean_name, ciphertext_sha256)."""
    import hashlib
    import os as _os

    try:
        clean_name = sanitize_uploaded_filename(document.filename)
        buf = bytearray()
        while True:
            chunk = await document.read(_READ_CHUNK_BYTES)
            if not chunk:
                break
            buf.extend(chunk)
            if len(buf) > max_bytes:
                raise HTTPException(
                    413,
                    f"Uploaded document exceeds maximum allowed size of {max_bytes} bytes",
                )
        if not buf:
            raise HTTPException(400, "Uploaded document must not be empty")
        raw_bytes = bytes(buf)
        validate_magic_bytes(clean_name, raw_bytes)
        key_material = master_secret if len(master_secret) >= 16 else (master_secret * 4)[:32]
        encrypted_blob = encrypt_upload_at_rest(raw_bytes, key_material, aad=clean_name.encode("utf-8"))
        cipher_sha256 = hashlib.sha256(encrypted_blob).hexdigest()
        from .config import settings

        effective_vault = (
            vault_dir
            or _os.environ.get("UPLOAD_VAULT_DIR", "").strip()
            or settings.upload_vault_dir
        )
        _os.makedirs(effective_vault, exist_ok=True)
        vault_path = _os.path.join(effective_vault, f"{cipher_sha256[:24]}_{clean_name}.enc")
        with open(vault_path, "wb") as fh:
            fh.write(encrypted_blob)
        return clean_name, cipher_sha256
    finally:
        await document.close()


