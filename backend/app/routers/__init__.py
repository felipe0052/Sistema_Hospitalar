from fastapi import APIRouter

from app.routers import auth, avisos, dashboard, documentos, eventos, faq, setores, usuarios

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(usuarios.router)
api_router.include_router(setores.router)
api_router.include_router(avisos.router)
api_router.include_router(eventos.router)
api_router.include_router(documentos.router)
api_router.include_router(faq.router)
api_router.include_router(dashboard.router)
