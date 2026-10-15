from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .db import get_db
from .security import decode_token
from .models import User

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")
def current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    p = decode_token(token)
    if not p: raise HTTPException(401, "Invalid or expired token")
    u = db.get(User, p["sub"])
    if not u or not u.is_active: raise HTTPException(401, "User not found")
    return u
def require(*roles):
    def dep(u: User = Depends(current_user)):
        if u.role not in roles: raise HTTPException(403, f"Requires role: {', '.join(roles)}")
        return u
    return dep
