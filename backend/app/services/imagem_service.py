"""Validação e reprocessamento de imagens enviadas (capa de avisos/notícias)."""

import io

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.exceptions import TipoArquivoNaoAceito

FORMATOS_ACEITOS = {"JPEG", "PNG", "WEBP"}
LIMITE_PIXELS = 40_000_000  # ~40 megapixels: protege contra decompression bomb
QUALIDADE_WEBP = 82
MIME_WEBP = "image/webp"
TAMANHOS = {"capa": 1200, "miniatura": 400}  # lado máximo em pixels de cada variante


def _erro(msg: str) -> TipoArquivoNaoAceito:
    return TipoArquivoNaoAceito(msg, erros={"imagem": msg})


def abrir_imagem_validada(conteudo: bytes) -> Image.Image:
    """Valida o conteúdo REAL do arquivo (não a extensão nem o Content-Type) e devolve a imagem já orientada."""
    if not conteudo:
        raise _erro("O arquivo enviado está vazio.")
    try:
        with Image.open(io.BytesIO(conteudo)) as sondagem:
            if sondagem.format not in FORMATOS_ACEITOS:
                raise _erro("Formato de imagem não suportado. Envie JPEG, PNG ou WebP.")
            largura, altura = sondagem.size
            if largura * altura > LIMITE_PIXELS:
                raise _erro("A imagem tem dimensões grandes demais.")
            sondagem.verify()  # checa a integridade sem decodificar tudo
        imagem = Image.open(io.BytesIO(conteudo))
        imagem.load()
    except TipoArquivoNaoAceito:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError):
        raise _erro("O arquivo enviado não é uma imagem válida (JPEG, PNG ou WebP).") from None
    # Aplica a rotação do EXIF ANTES de descartar os metadados (senão fotos de celular ficam deitadas)
    return ImageOps.exif_transpose(imagem)


def gerar_variante_webp(imagem: Image.Image, lado_max: int) -> bytes:
    """Redimensiona (sem ampliar) e converte para WebP. Metadados (EXIF/GPS) não são copiados."""
    variante = imagem.copy()
    variante.thumbnail((lado_max, lado_max))
    if variante.mode not in ("RGB", "RGBA"):
        tem_alfa = variante.mode == "P" or "A" in variante.getbands()
        variante = variante.convert("RGBA" if tem_alfa else "RGB")
    buffer = io.BytesIO()
    variante.save(buffer, format="WEBP", quality=QUALIDADE_WEBP)
    return buffer.getvalue()


def chave_variante(base: str, tamanho: str) -> str:
    return f"{base}_{'capa' if tamanho == 'capa' else 'mini'}.webp"