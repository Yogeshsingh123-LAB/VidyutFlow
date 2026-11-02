import base64
from datetime import datetime, timedelta, timezone
import os
import re
import bcrypt
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from jose import jwt, JWTError
from .config import settings

_FIELD_ENC_PREFIX = "AES256GCM:v1:"
_SCRIPT_OR_TAG_RE = re.compile(r"<\s*/?\s*(script|iframe|object|embed|svg|img|style)\b[^>]*>", re.IGNORECASE)
_EVENT_ATTR_RE = re.compile(r"\bon[a-z]+\s*=", re.IGNORECASE)


def _derive_field_key() -> bytes:
    raw = (settings.secret_key or "vidyutflow-dev-fallback-key-32bytes!").encode("utf-8")
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"vidyutflow-ugvcl-pii-field-v1",
        info=b"vidyutflow-aes256gcm-field-at-rest",
    )
    return hkdf.derive(raw)


def encrypt_field_aes256(plaintext: str, aad: str = "vidyutflow-pii") -> str:
    """Encrypt sensitive PII/KYC text at rest with HKDF-SHA256 + AES-256-GCM."""
    if plaintext is None:
        return ""
    nonce = os.urandom(12)
    ct = AESGCM(_derive_field_key()).encrypt(nonce, plaintext.encode("utf-8"), aad.encode("utf-8"))
    return (
        f"{_FIELD_ENC_PREFIX}"
        f"{base64.urlsafe_b64encode(nonce).decode('ascii')}:"
        f"{base64.urlsafe_b64encode(ct).decode('ascii')}"
    )


def decrypt_field_aes256(token: str, aad: str = "vidyutflow-pii") -> str:
    """Verify GCM authentication tag and decrypt an AES-256-GCM field token."""
    if not token or not token.startswith(_FIELD_ENC_PREFIX):
        raise ValueError("Invalid AES-256-GCM field envelope")
    rest = token[len(_FIELD_ENC_PREFIX):]
    nonce_b64, sep, ct_b64 = rest.partition(":")
    if not sep:
        raise ValueError("Malformed AES-256-GCM token")
    nonce = base64.urlsafe_b64decode(nonce_b64.encode("ascii"))
    ct = base64.urlsafe_b64decode(ct_b64.encode("ascii"))
    pt = AESGCM(_derive_field_key()).decrypt(nonce, ct, aad.encode("utf-8"))
    return pt.decode("utf-8")


def sanitize_untrusted_text(value: str) -> str:
    """Strip executable HTML/script payloads and control chars for defense-in-depth XSS safety."""
    if not value:
        return ""
    cleaned = "".join(ch for ch in value if ch in ("\n", "\t") or ord(ch) >= 32)
    cleaned = _SCRIPT_OR_TAG_RE.sub("", cleaned)
    cleaned = _EVENT_ATTR_RE.sub("", cleaned)
    return cleaned.strip()


def hash_password(p: str) -> str:
    password = p.encode()
    if len(password) > 72:
        raise ValueError("Password must be at most 72 bytes when encoded as UTF-8")
    return bcrypt.hashpw(password, bcrypt.gensalt()).decode()
def verify_password(p: str, h: str) -> bool:
    try:
        password = p.encode()
        return len(password) <= 72 and bcrypt.checkpw(password, h.encode())
    except (ValueError, TypeError): return False
def create_token(user_id: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({"sub": user_id, "role": role, "exp": exp}, settings.secret_key, algorithm=settings.algorithm)
def decode_token(token: str):
    try: return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError: return None
