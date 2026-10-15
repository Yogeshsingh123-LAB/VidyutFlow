from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError
from .config import settings

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
def hash_password(p: str) -> str: return pwd.hash(p)
def verify_password(p: str, h: str) -> bool: return pwd.verify(p, h)
def create_token(user_id: str, role: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({"sub": user_id, "role": role, "exp": exp}, settings.secret_key, algorithm=settings.algorithm)
def decode_token(token: str):
    try: return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError: return None
