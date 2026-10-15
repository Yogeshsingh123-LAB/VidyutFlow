from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from ..db import get_db
from ..models import User
from ..security import hash_password, verify_password, create_token
from ..deps import current_user

router = APIRouter(prefix="/auth", tags=["auth"])
class Register(BaseModel):
    email: EmailStr; name: str; password: str; role: str = "consumer"; zone: str = "North"

@router.post("/register", status_code=201)
def register(body: Register, db: Session = Depends(get_db)):
    if body.role not in ("consumer","officer","engineer","admin"): raise HTTPException(400, "Invalid role")
    if db.query(User).filter(User.email==body.email).first(): raise HTTPException(400, "Email already registered")
    u = User(email=body.email, name=body.name, role=body.role, zone=body.zone, hashed_password=hash_password(body.password))
    db.add(u); db.commit(); db.refresh(u)
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role, "zone": u.zone}

@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email==form.username).first()
    if not u or not verify_password(form.password, u.hashed_password): raise HTTPException(401, "Invalid email or password")
    return {"access_token": create_token(u.id, u.role), "token_type": "bearer", "role": u.role, "name": u.name, "user_id": u.id, "zone": u.zone}

@router.get("/me")
def me(u: User = Depends(current_user)):
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role, "zone": u.zone}
