from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt, JWTError
from .config import settings

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
