from fastapi import APIRouter

from app.routers import auth, avisos, dashboard, eventos, usuarios

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(usuarios.router)
api_router.include_router(avisos.router)
api_router.include_router(eventos.router)
api_router.include_router(dashboard.router)
