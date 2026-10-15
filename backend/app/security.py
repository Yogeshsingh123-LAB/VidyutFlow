from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt, JWTError
from .config import settings

def hash_password(p: str) -> str:
    # bcrypt operates on <=72 bytes; encode explicitly so long passwords fail predictably instead of silently truncating in callers
    return bcrypt.hashpw(p.encode()[:72], bcrypt.gensalt()).decode()
def verify_password(p: str, h: str) -> bool:
    try: return bcrypt.checkpw(p.encode()[:72], h.encode())
    except (ValueError, TypeError): return False
def create_token(user_id: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({"sub": user_id, "role": role, "exp": exp}, settings.secret_key, algorithm=settings.algorithm)
def decode_token(token: str):
    try: return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError: return None
