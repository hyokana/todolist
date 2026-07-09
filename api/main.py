from datetime import datetime, timedelta, timezone
from itertools import count
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

app = FastAPI(title="Login API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- JWT config ---
# In production, load SECRET_KEY from env, never hardcode.
SECRET_KEY = "dev-secret-change-me-in-production-min-32-bytes"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15

# --- Dummy user ---
DUMMY_USER = {
    "email": "test@test.com",
    "password": "123456",
    "name": "Test User",
}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


bearer_scheme = HTTPBearer()


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    return sub


@app.get("/")
def root():
    return {"status": "ok"}


@app.post("/api/login")
def login(payload: LoginRequest):

    if not payload.email or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required",
        )

    if payload.email != DUMMY_USER["email"] or payload.password != DUMMY_USER["password"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({"sub": DUMMY_USER["email"]})

    return {
        "user": {
            "email": DUMMY_USER["email"],
            "name": DUMMY_USER["name"],
        },
        "token": token,
        "token_type": "bearer",
    }


# --- Todos (in-memory store; resets on restart) ---
# All todo routes require a valid bearer token via the router-level dependency.
todos_router = APIRouter(dependencies=[Depends(get_current_user)])

_id_seq = count(1)
TODOS: dict[int, dict] = {}


def _seed_todos() -> None:
    for title in ("Buy milk", "Write report", "Call dentist"):
        tid = next(_id_seq)
        TODOS[tid] = {"id": tid, "title": title, "completed": False}


_seed_todos()


class TodoCreate(BaseModel):
    title: str


class TodoUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None


@todos_router.get("/api/todos")
def list_todos():
    return sorted(TODOS.values(), key=lambda t: t["id"])


@todos_router.post("/api/todos", status_code=status.HTTP_201_CREATED)
def create_todo(payload: TodoCreate):
    title = payload.title.strip()
    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title is required",
        )
    tid = next(_id_seq)
    todo = {"id": tid, "title": title, "completed": False}
    TODOS[tid] = todo
    return todo


@todos_router.patch("/api/todos/{todo_id}")
def update_todo(todo_id: int, payload: TodoUpdate):
    todo = TODOS.get(todo_id)
    if todo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found"
        )
    if payload.title is not None:
        title = payload.title.strip()
        if not title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Title is required",
            )
        todo["title"] = title
    if payload.completed is not None:
        todo["completed"] = payload.completed
    return todo


@todos_router.delete("/api/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: int):
    if TODOS.pop(todo_id, None) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found"
        )
    return None


app.include_router(todos_router)
