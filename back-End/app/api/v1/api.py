from fastapi import APIRouter

from app.api.v1.endpoints import auth, avisos, documentos, usuarios

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(usuarios.router)
api_router.include_router(avisos.router)
api_router.include_router(documentos.router)
