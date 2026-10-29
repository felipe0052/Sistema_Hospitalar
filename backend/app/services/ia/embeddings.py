"""Embeddings locais (sem API externa e sem cota).

Usa `sentence-transformers` (IA_MODELO_EMBEDDING, 384 dimensões) quando instalado. Sem ele, cai em um
embedder lexical determinístico por hashing, com a mesma dimensão, para o sistema e os testes funcionarem
sem baixar modelos. Defina IA_EMBEDDING_BACKEND=hash para forçar o modo leve ou =local para exigir o modelo.
"""

import hashlib
import logging
import math
import re
import unicodedata
from functools import lru_cache

from app.core.config import settings
from app.models.documento_trecho import DIMENSAO_EMBEDDING

logger = logging.getLogger(__name__)

_TOKEN = re.compile(r"[a-z0-9]+")

_STOPWORDS = frozenset(
    "a o as os um uma uns umas de do da dos das em no na nos nas por para com sem sobre ate e ou que se ao aos "
    "como onde quando qual quais ser sao foi deve devem deverao pode podem ha ja mais muito ".split()
)


def _normalizar(texto: str) -> str:
    sem_acento = "".join(c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c))
    return sem_acento.lower()


def _embedding_hash(texto: str) -> list[float]:
    """Bag-of-words (unigramas + bigramas) com hashing sem sinal, normalizado em L2.

    Sem sinal de propósito: com hashing assinado, colisões podem cancelar um termo em comum e zerar a similaridade.
    """
    tokens = [t for t in _TOKEN.findall(_normalizar(texto)) if t not in _STOPWORDS]
    vetor = [0.0] * DIMENSAO_EMBEDDING
    termos = tokens + [f"{a}_{b}" for a, b in zip(tokens, tokens[1:], strict=False)]
    for termo in termos:
        h = int.from_bytes(hashlib.blake2b(termo.encode(), digest_size=8).digest(), "big")
        vetor[h % DIMENSAO_EMBEDDING] += 1.0
    norma = math.sqrt(sum(v * v for v in vetor))
    return [v / norma for v in vetor] if norma else vetor


@lru_cache(maxsize=1)
def _carregar_modelo():
    from sentence_transformers import SentenceTransformer  # import tardio: dependência opcional

    return SentenceTransformer(settings.IA_MODELO_EMBEDDING)


def _usar_modelo_local() -> bool:
    modo = settings.IA_EMBEDDING_BACKEND.lower()
    if modo == "hash":
        return False
    try:
        _carregar_modelo()
        return True
    except Exception:
        if modo == "local":
            raise
        logger.warning("sentence-transformers indisponível; usando embedder lexical por hashing.")
        return False


def gerar_embeddings(textos: list[str]) -> list[list[float]]:
    """Gera um vetor de 384 dimensões por texto."""
    if not textos:
        return []
    if _usar_modelo_local():
        vetores = _carregar_modelo().encode(textos, normalize_embeddings=True)
        return [[float(x) for x in v] for v in vetores]
    return [_embedding_hash(t) for t in textos]
