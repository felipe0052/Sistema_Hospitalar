from fastapi import APIRouter

from app.routers import (
    acessos_rapidos,
    aniversariantes,
    auth,
    avisos,
    dashboard,
    diretorio,
    documentos,
    eventos,
    faq,
    google_agenda,
    ia,
    notificacoes,
    reconhecimentos,
    setores,
    usuarios,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(aniversariantes.router)
api_router.include_router(diretorio.router)
api_router.include_router(usuarios.router)
api_router.include_router(setores.router)
api_router.include_router(avisos.router)
api_router.include_router(eventos.router)
api_router.include_router(google_agenda.router)
api_router.include_router(documentos.router)
api_router.include_router(faq.router)
api_router.include_router(dashboard.router)
api_router.include_router(notificacoes.router)
api_router.include_router(reconhecimentos.router)
api_router.include_router(reconhecimentos.router_indicacoes)
api_router.include_router(ia.router)
api_router.include_router(acessos_rapidos.router)
