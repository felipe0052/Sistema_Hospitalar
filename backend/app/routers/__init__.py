from fastapi import APIRouter

from app.routers import auth, usuarios

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(usuarios.router)
