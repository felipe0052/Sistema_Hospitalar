from fastapi import APIRouter

from app.routers import aniversariantes, auth, avisos, dashboard, documentos, eventos, google_agenda, usuarios

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(aniversariantes.router)
api_router.include_router(usuarios.router)
api_router.include_router(avisos.router)
api_router.include_router(documentos.router)
api_router.include_router(eventos.router)
api_router.include_router(google_agenda.router)
api_router.include_router(dashboard.router)
