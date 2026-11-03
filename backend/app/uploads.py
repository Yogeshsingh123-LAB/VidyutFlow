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


_HTML_XML_DISGUISE_HEADERS = (
    b"<!doctype html",
    b"<html",
    b"<svg",
    b"<?xml",
    b"<script",
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
        data_stripped = data.strip().lower()
        if any(data_stripped.startswith(tag) for tag in _HTML_XML_DISGUISE_HEADERS):
            raise HTTPException(
                400,
                "Invalid text document: HTML/XML/SVG script tags detected in .txt upload",
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


import abc
import logging

logger = logging.getLogger("vidyutflow.storage")


class BaseStorageProvider(abc.ABC):
    """Abstract interface for storing and retrieving encrypted documents across instances."""

    @abc.abstractmethod
    def save(self, filename: str, encrypted_bytes: bytes) -> str:
        """Store encrypted payload and return storage identifier/path."""
        pass

    @abc.abstractmethod
    def load(self, filename: str, prefix: str | None = None) -> bytes:
        """Load encrypted payload by filename or prefix."""
        pass

    @abc.abstractmethod
    def exists(self, filename: str, prefix: str | None = None) -> bool:
        """Check if document exists in storage."""
        pass

    @abc.abstractmethod
    def delete(self, filename: str, prefix: str | None = None) -> bool:
        """Delete document from storage."""
        pass


class LocalStorageProvider(BaseStorageProvider):
    """Local filesystem storage provider for single-instance or development environments."""

    def __init__(self, vault_dir: str):
        import os
        self.vault_dir = vault_dir
        os.makedirs(self.vault_dir, exist_ok=True)

    def save(self, filename: str, encrypted_bytes: bytes) -> str:
        import os
        vault_path = os.path.join(self.vault_dir, filename)
        with open(vault_path, "wb") as fh:
            fh.write(encrypted_bytes)
        return vault_path

    def _find_matches(self, filename: str, prefix: str | None = None) -> list[str]:
        import glob
        import os
        sanitized = PurePosixPath(filename.replace("\\", "/")).name
        if not sanitized or sanitized != filename:
            raise ValueError("Invalid document name path structure")
        if not os.path.isdir(self.vault_dir):
            raise FileNotFoundError(f"Storage vault directory does not exist: {self.vault_dir}")
        matches: list[str] = []
        if prefix:
            matches = glob.glob(os.path.join(self.vault_dir, f"{prefix}*_{filename}.enc"))
        if not matches:
            matches = glob.glob(os.path.join(self.vault_dir, f"*_{filename}.enc"))
        if not matches:
            exact = os.path.join(self.vault_dir, filename)
            if os.path.isfile(exact):
                matches = [exact]
        matches.sort(key=lambda p: os.path.getmtime(p), reverse=True)
        return matches

    def load(self, filename: str, prefix: str | None = None) -> bytes:
        matches = self._find_matches(filename, prefix)
        if not matches:
            raise FileNotFoundError(f"Document {filename} not found in storage vault")
        with open(matches[0], "rb") as fh:
            return fh.read()

    def exists(self, filename: str, prefix: str | None = None) -> bool:
        return len(self._find_matches(filename, prefix)) > 0

    def delete(self, filename: str, prefix: str | None = None) -> bool:
        import os
        matches = self._find_matches(filename, prefix)
        if not matches:
            return False
        for p in matches:
            try:
                os.remove(p)
            except OSError:
                pass
        return True


class S3MinioStorageProvider(BaseStorageProvider):
    """Shared S3/MinIO compatible object storage provider for multi-instance production."""

    def __init__(
        self,
        bucket_name: str,
        endpoint_url: str = "",
        access_key: str = "",
        secret_key: str = "",
        region: str = "us-east-1",
    ):
        self.bucket_name = bucket_name
        self.endpoint_url = endpoint_url
        self.access_key = access_key
        self.secret_key = secret_key
        self.region = region
        self._client = None

    def _get_client(self):
        if self._client is None:
            try:
                import boto3
                kwargs = {"region_name": self.region}
                if self.endpoint_url:
                    kwargs["endpoint_url"] = self.endpoint_url
                if self.access_key and self.secret_key:
                    kwargs["aws_access_key_id"] = self.access_key
                    kwargs["aws_secret_access_key"] = self.secret_key
                self._client = boto3.client("s3", **kwargs)
            except ImportError:
                logger.warning("boto3 is not installed; S3MinioStorageProvider requires boto3")
                raise RuntimeError("boto3 library is required for S3/MinIO shared storage")
        return self._client

    def save(self, filename: str, encrypted_bytes: bytes) -> str:
        client = self._get_client()
        client.put_object(
            Bucket=self.bucket_name,
            Key=filename,
            Body=encrypted_bytes,
            ContentType="application/octet-stream",
            Metadata={"encrypted": "aes-256-gcm"},
        )
        return f"s3://{self.bucket_name}/{filename}"

    def load(self, filename: str, prefix: str | None = None) -> bytes:
        client = self._get_client()
        target_key = filename
        if prefix or not target_key.endswith(".enc"):
            resp = client.list_objects_v2(Bucket=self.bucket_name, Prefix=prefix or "")
            keys = [obj["Key"] for obj in resp.get("Contents", []) if filename in obj["Key"]]
            if not keys:
                raise FileNotFoundError(f"Document {filename} not found in S3 bucket {self.bucket_name}")
            target_key = keys[0]
        obj = client.get_object(Bucket=self.bucket_name, Key=target_key)
        return obj["Body"].read()

    def exists(self, filename: str, prefix: str | None = None) -> bool:
        client = self._get_client()
        try:
            client.head_object(Bucket=self.bucket_name, Key=filename)
            return True
        except Exception:
            return False

    def delete(self, filename: str, prefix: str | None = None) -> bool:
        client = self._get_client()
        try:
            client.delete_object(Bucket=self.bucket_name, Key=filename)
            return True
        except Exception:
            return False


def get_storage_provider(vault_dir: str | None = None) -> BaseStorageProvider:
    """Factory creating configured storage provider (local, s3, or minio)."""
    import os as _os
    from .config import settings

    provider_type = (settings.storage_provider or "local").lower().strip()
    effective_vault = (
        vault_dir
        or _os.environ.get("UPLOAD_VAULT_DIR", "").strip()
        or settings.upload_vault_dir
    )

    if provider_type in {"s3", "minio"}:
        return S3MinioStorageProvider(
            bucket_name=settings.s3_bucket_name,
            endpoint_url=settings.s3_endpoint_url,
            access_key=settings.s3_access_key,
            secret_key=settings.s3_secret_key,
            region=settings.s3_region,
        )

    if settings.app_env == "production":
        logger.warning(
            "Local storage provider in production cannot be shared across multiple instances. "
            "Configure STORAGE_PROVIDER=s3 or STORAGE_PROVIDER=minio for multi-instance deployments."
        )

    return LocalStorageProvider(vault_dir=effective_vault)


async def validate_and_encrypt_upload(
    document: UploadFile,
    max_bytes: int,
    master_secret: str,
    vault_dir: str | None = None,
) -> tuple[str, str]:
    """Validate upload, encrypt payload via HKDF-SHA256 + AES-256-GCM, and save via configured storage provider."""
    import hashlib

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

        provider = get_storage_provider(vault_dir=vault_dir)
        storage_filename = f"{cipher_sha256[:24]}_{clean_name}.enc"
        provider.save(storage_filename, encrypted_blob)

        return clean_name, cipher_sha256
    finally:
        await document.close()


def retrieve_decrypted_document(
    clean_name: str,
    master_secret: str,
    vault_dir: str | None = None,
    prefix: str | None = None,
) -> bytes:
    """Locate encrypted document in storage provider, authenticate, and decrypt with AES-256-GCM."""
    sanitized = PurePosixPath(clean_name.replace("\\", "/")).name
    if not sanitized or sanitized != clean_name:
        raise ValueError("Invalid document name path structure")

    provider = get_storage_provider(vault_dir=vault_dir)
    encrypted_blob = provider.load(clean_name, prefix=prefix)

    key_material = master_secret if len(master_secret) >= 16 else (master_secret * 4)[:32]
    return decrypt_upload_at_rest(encrypted_blob, key_material, aad=clean_name.encode("utf-8"))
