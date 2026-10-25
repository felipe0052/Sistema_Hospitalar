from datetime import date, datetime
from html import escape, unescape
from html.parser import HTMLParser
import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

CategoriaAvisoLiteral = Literal["NOTICIA", "COMUNICADO", "PROMOCAO", "MUDANCA_SETOR"]

TAGS_PERMITIDAS = {"p", "br", "b", "strong", "i", "em", "ul", "ol", "li", "a"}
TAGS_IGNORAR_CONTEUDO = {"script", "style", "iframe", "object", "embed"}
_PREFIXOS_HREF_SEGUROS = ("http://", "https://", "mailto:", "/")


class _SanitizadorHTMLAviso(HTMLParser):
    """Sanitizador HTML que preserva apenas as tags permitidas em S2-T1."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.partes: list[str] = []
        self._profundidade_ignorada = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_lower = tag.lower()
        if tag_lower in TAGS_IGNORAR_CONTEUDO:
            self._profundidade_ignorada += 1
            return
        if self._profundidade_ignorada > 0:
            return
        if tag_lower not in TAGS_PERMITIDAS:
            return

        if tag_lower == "br":
            self.partes.append("<br>")
            return

        if tag_lower == "a":
            href_seguro = None
            for nome_attr, valor_attr in attrs:
                if nome_attr and nome_attr.lower() == "href" and valor_attr:
                    val = valor_attr.strip()
                    if val.lower().startswith(_PREFIXOS_HREF_SEGUROS):
                        href_seguro = escape(val, quote=True)
                    break
            if href_seguro:
                self.partes.append(f'<a href="{href_seguro}">')
            else:
                self.partes.append("<a>")
            return

        self.partes.append(f"<{tag_lower}>")

    def handle_endtag(self, tag: str) -> None:
        tag_lower = tag.lower()
        if tag_lower in TAGS_IGNORAR_CONTEUDO:
            if self._profundidade_ignorada > 0:
                self._profundidade_ignorada -= 1
            return
        if self._profundidade_ignorada > 0:
            return
        if tag_lower in TAGS_PERMITIDAS and tag_lower != "br":
            self.partes.append(f"</{tag_lower}>")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_lower = tag.lower()
        if self._profundidade_ignorada > 0:
            return
        if tag_lower == "br":
            self.partes.append("<br>")

    def handle_data(self, data: str) -> None:
        if self._profundidade_ignorada == 0:
            self.partes.append(escape(data, quote=False))

    def handle_entityref(self, name: str) -> None:
        if self._profundidade_ignorada == 0:
            self.partes.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        if self._profundidade_ignorada == 0:
            self.partes.append(f"&#{name};")


class _ExtratorTextoHTML(HTMLParser):
    """Extrai texto puro sem tags HTML para geração do resumo."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.partes: list[str] = []
        self._profundidade_ignorada = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_lower = tag.lower()
        if tag_lower in TAGS_IGNORAR_CONTEUDO:
            self._profundidade_ignorada += 1
        elif tag_lower in {"p", "br", "li", "div"}:
            self.partes.append(" ")

    def handle_endtag(self, tag: str) -> None:
        tag_lower = tag.lower()
        if tag_lower in TAGS_IGNORAR_CONTEUDO and self._profundidade_ignorada > 0:
            self._profundidade_ignorada -= 1
        elif tag_lower in {"p", "li", "ul", "ol", "div"}:
            self.partes.append(" ")

    def handle_data(self, data: str) -> None:
        if self._profundidade_ignorada == 0:
            self.partes.append(data)


def sanitizar_html_aviso(conteudo: str) -> str:
    parser = _SanitizadorHTMLAviso()
    parser.feed(conteudo)
    parser.close()
    return "".join(parser.partes).strip()


def extrair_resumo_sem_html(conteudo: str, tamanho_max: int = 200) -> str:
    extrator = _ExtratorTextoHTML()
    extrator.feed(unescape(conteudo or ""))
    extrator.close()
    texto_limpo = re.sub(r"\s+", " ", "".join(extrator.partes)).strip()
    return texto_limpo[:tamanho_max]


class AutorAvisoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    nome: str


class AvisoIn(BaseModel):
    titulo: str = Field(min_length=3, max_length=200)
    conteudo: str = Field(min_length=1)
    categoria: CategoriaAvisoLiteral = "COMUNICADO"
    destaque: bool = False
    data_expiracao: date | None = None

    @field_validator("titulo", mode="before")
    @classmethod
    def _limpar_titulo(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("conteudo", mode="before")
    @classmethod
    def _validar_e_sanitizar_conteudo(cls, v: str) -> str:
        if not isinstance(v, str) or not v.strip():
            raise ValueError("Este campo é obrigatório.")
        sanitizado = sanitizar_html_aviso(v)
        texto_puro = extrair_resumo_sem_html(sanitizado, tamanho_max=50)
        if not texto_puro:
            raise ValueError("O conteúdo do aviso não pode estar em branco.")
        return sanitizado

    @field_validator("data_expiracao", mode="before")
    @classmethod
    def _limpar_data_expiracao(cls, v):
        if v == "" or v is None:
            return None
        return v


class AvisoResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_aviso: int
    titulo: str
    resumo: str
    categoria: CategoriaAvisoLiteral
    destaque: bool
    data_publicacao: datetime
    autor: AutorAvisoOut | None = None


class AvisoOut(AvisoResumo):
    conteudo: str
    data_expiracao: date | None = None
    data_atualizacao: datetime | None = None
    expirado: bool = False


class PaginadoAvisosResumoOut(BaseModel):
    itens: list[AvisoResumo]
    total: int
    pagina: int
    tamanho: int


class PaginadoAvisosOut(BaseModel):
    itens: list[AvisoOut]
    total: int
    pagina: int
    tamanho: int
