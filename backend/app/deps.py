from datetime import datetime, timezone
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .db import get_db
from .security import decode_token
from .models import User, UserSession

AUTH_COOKIE_NAME = "vidyutflow_access_token"
oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def current_user(
    request: Request,
    token: str | None = Depends(oauth2),
    db: Session = Depends(get_db),
) -> User:
    raw_token = token or request.cookies.get(AUTH_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(401, "Not authenticated")
    p = decode_token(raw_token, expected_type="access")
    if not p:
        raise HTTPException(401, "Invalid or expired token")

    jti = p.get("jti")
    if jti:
        active_sess = db.query(UserSession).filter(UserSession.jti == jti).first()
        if active_sess:
            if active_sess.is_revoked:
                raise HTTPException(401, "Session has been revoked")
            now_utc = datetime.now(timezone.utc)
            sess_exp = active_sess.expires_at
            if sess_exp.tzinfo is None:
                sess_exp = sess_exp.replace(tzinfo=timezone.utc)
            if sess_exp < now_utc:
                raise HTTPException(401, "Session has expired")
            request.state.session_jti = jti
            request.state.user_session = active_sess

    u = db.get(User, p["sub"])
    if not u or not u.is_active:
        raise HTTPException(401, "User not found")
    return u


def require(*roles):
    def dep(u: User = Depends(current_user)):
        if u.role not in roles:
            raise HTTPException(403, f"Requires role: {', '.join(roles)}")
        return u

    return dep


get_current_user = current_user
