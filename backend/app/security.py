import base64
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
import re
import secrets
import uuid
import bcrypt
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from jose import jwt, JWTError
from .config import settings

_FIELD_ENC_PREFIX = "AES256GCM:v1:"
_DANGEROUS_TAG_RE = re.compile(
    r"<\s*/?\s*(script|iframe|object|embed|svg|img|style|link|meta|base|form|input|button|body|html|applet)\b[^>]*>",
    re.IGNORECASE,
)
_EVENT_ATTR_RE = re.compile(r"\bon[a-z]+\s*=\s*([\"'][^\"']*[\"']|[^\s>]+)?", re.IGNORECASE)
_JS_SCHEME_RE = re.compile(r"(javascript|vbscript|data):[^\s]*", re.IGNORECASE)


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
    """Strip executable HTML/script payloads, JS URI schemes, and control chars for defense-in-depth XSS safety."""
    if not value:
        return ""
    cleaned = "".join(ch for ch in value if ch in ("\n", "\t", "\r") or ord(ch) >= 32)
    cleaned = _DANGEROUS_TAG_RE.sub("", cleaned)
    cleaned = _EVENT_ATTR_RE.sub("", cleaned)
    cleaned = _JS_SCHEME_RE.sub("", cleaned)
    return cleaned.strip()


COMMON_PASSWORDS = frozenset({
    "password", "password123", "12345678", "123456789", "qwerty123",
    "admin123", "welcome1", "vidyut123", "letmein1", "iloveyou"
})


def validate_password_policy(p: str) -> None:
    """NIST SP 800-63B password guidance: length >= 8, max 72 bytes, blacklist common passwords."""
    if not p or len(p) < 8:
        raise ValueError("Password must be at least 8 characters long")
    raw = p.encode("utf-8")
    if len(raw) > 72:
        raise ValueError("Password must be at most 72 bytes when encoded as UTF-8")
    if p.lower() in COMMON_PASSWORDS:
        raise ValueError("Password is too common; please choose a stronger passphrase")


def hash_password(p: str) -> str:
    validate_password_policy(p)
    return bcrypt.hashpw(p.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(p: str, h: str) -> bool:
    try:
        raw = p.encode("utf-8")
        return len(raw) <= 72 and bcrypt.checkpw(raw, h.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def hash_token(raw_token: str) -> str:
    """Compute deterministic SHA-256 hash for storing refresh and reset tokens at rest."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_refresh_token() -> tuple[str, str]:
    """Generate high-entropy 384-bit refresh token and its SHA-256 hash (never store raw token)."""
    raw = secrets.token_urlsafe(48)
    return raw, hash_token(raw)


def generate_password_reset_token() -> tuple[str, str]:
    """Generate high-entropy 256-bit password reset token and its SHA-256 hash."""
    raw = secrets.token_urlsafe(32)
    return raw, hash_token(raw)


def create_token(
    user_id: str,
    role: str,
    jti: str | None = None,
    token_type: str = "access",
    expires_minutes: int | None = None,
) -> str:
    """Create short-lived JWT with RFC 7519 claims: sub, role, iss, aud, jti, token_type, exp, iat."""
    now_utc = datetime.now(timezone.utc)
    mins = expires_minutes if expires_minutes is not None else settings.access_token_minutes
    exp = now_utc + timedelta(minutes=mins)
    token_jti = jti or str(uuid.uuid4())
    claims = {
        "sub": user_id,
        "role": role,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "jti": token_jti,
        "token_type": token_type,
        "iat": int(now_utc.timestamp()),
        "exp": exp,
    }
    return jwt.encode(claims, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str, expected_type: str = "access") -> dict | None:
    """Validate signature, expiry, algorithm, and standard claims with backward tolerance."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
            options={"verify_exp": True, "verify_aud": False, "verify_iss": False},
        )
        # Check issuer if present
        if "iss" in payload and payload["iss"] != settings.jwt_issuer:
            return None
        # Check audience if present
        if "aud" in payload and payload["aud"] != settings.jwt_audience:
            return None
        # Check token_type if present
        if expected_type and payload.get("token_type") and payload.get("token_type") != expected_type:
            return None
        return payload
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# Staff TOTP Multi-Factor Authentication (pyotp RFC 6238)
# ---------------------------------------------------------------------------
def generate_totp_secret() -> str:
    import pyotp
    return pyotp.random_base32()


def encrypt_totp_secret(secret: str) -> str:
    return encrypt_field_aes256(secret, aad="vidyutflow-totp-secret")


def decrypt_totp_secret(encrypted_token: str) -> str:
    return decrypt_field_aes256(encrypted_token, aad="vidyutflow-totp-secret")


def get_totp_provisioning_uri(secret: str, email: str) -> str:
    import pyotp
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name="VidyutFlow UGVCL")


def verify_totp_code(secret: str, code: str) -> bool:
    import pyotp
    if not secret or not code:
        return False
    try:
        clean_code = "".join(ch for ch in code if ch.isdigit())
        return pyotp.TOTP(secret).verify(clean_code, valid_window=1)
    except Exception:
        return False


def generate_recovery_codes(count: int = 8) -> tuple[list[str], list[str]]:
    """Generate plaintext backup recovery codes for user display and SHA-256 hashes for storage."""
    plaintext = [f"{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}" for _ in range(count)]
    hashed = [hash_token(c) for c in plaintext]
    return plaintext, hashed


def verify_recovery_code(code: str, stored_hashes: list[str]) -> tuple[bool, list[str]]:
    """Single-use verification against stored SHA-256 hashes. Consumed code is removed."""
    if not code or not stored_hashes:
        return False, stored_hashes
    input_hash = hash_token(code.strip().upper())
    for idx, h in enumerate(stored_hashes):
        if secrets.compare_digest(input_hash, h):
            updated = [item for i, item in enumerate(stored_hashes) if i != idx]
            return True, updated
    return False, stored_hashes
