"""Serviço de abstração de armazenamento de arquivos de Documentos/POPs (S3-T1 / S4-T2 — §3 e §7.7)."""

import os
import uuid
from collections.abc import Iterator
from pathlib import Path
from typing import Protocol, runtime_checkable

from app.core.config import settings


@runtime_checkable
class StorageService(Protocol):
    """Protocolo de armazenamento de arquivos binários (Local ou Object Storage S3/OCI)."""

    def salvar(self, conteudo: bytes, chave: str, mime_type: str) -> str: ...

    def abrir(self, chave: str) -> bytes | Iterator[bytes]: ...

    def excluir(self, chave: str) -> None: ...


class LocalStorage:
    """Armazena arquivos no sistema de arquivos local em settings.UPLOAD_DIR/<chave>.

    Garante segurança de paths e limpeza de temporários.
    """

    def __init__(self, base_dir: str | Path | None = None) -> None:
        self.base_dir = Path(base_dir or settings.UPLOAD_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(self.base_dir, 0o750)
        except OSError:
            pass
        self.limpar_temporarios()

    def _resolver_caminho(self, chave: str) -> Path:
        chave_str = str(chave or "").strip()
        if not chave_str or "\x00" in chave_str:
            raise ValueError("Chave de armazenamento inválida.")
        chave_limpa = chave_str.lstrip("/\\")
        destino = (self.base_dir / chave_limpa).resolve()
        # Previne ataques de Path Traversal garantindo que o destino está estritamente dentro de base_dir
        try:
            destino.relative_to(self.base_dir)
        except ValueError as exc:
            raise ValueError(f"Chave de armazenamento inválida: {chave}") from exc
        if destino == self.base_dir:
            raise ValueError(f"Chave de armazenamento inválida: {chave}")
        return destino

    def limpar_temporarios(self) -> int:
        """Remove arquivos temporários (.tmp) órfãos dentro do diretório de uploads."""
        removidos = 0
        if not self.base_dir.exists():
            return removidos
        for tmp_file in self.base_dir.rglob("*.tmp"):
            if tmp_file.is_file():
                try:
                    tmp_file.unlink(missing_ok=True)
                    removidos += 1
                except OSError:
                    pass
        return removidos

    def salvar(self, conteudo: bytes, chave: str, mime_type: str) -> str:
        destino = self._resolver_caminho(chave)
        destino.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(destino.parent, 0o750)
        except OSError:
            pass

        arquivo_tmp = destino.with_name(f".{destino.name}.{uuid.uuid4().hex}.tmp")
        try:
            arquivo_tmp.write_bytes(conteudo)
            try:
                os.chmod(arquivo_tmp, 0o640)
            except OSError:
                pass
            arquivo_tmp.replace(destino)
        finally:
            if arquivo_tmp.exists():
                arquivo_tmp.unlink(missing_ok=True)
        return chave

    def abrir(self, chave: str) -> bytes:
        destino = self._resolver_caminho(chave)
        if not destino.is_file():
            raise FileNotFoundError(f"Arquivo não encontrado no storage local: {chave}")
        return destino.read_bytes()

    def excluir(self, chave: str) -> None:
        if not chave:
            return
        try:
            destino = self._resolver_caminho(chave)
            if destino.is_file():
                destino.unlink(missing_ok=True)
        except ValueError:
            return


class S3Storage:
    """Armazena arquivos em Object Storage compatível com S3 (OCI Object Storage / AWS S3 / MinIO)."""

    def __init__(
        self,
        endpoint_url: str | None = None,
        bucket: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        region: str | None = None,
    ) -> None:
        self.endpoint_url = endpoint_url if endpoint_url is not None else settings.S3_ENDPOINT_URL
        self.bucket = bucket if bucket is not None else settings.S3_BUCKET
        self.access_key = access_key if access_key is not None else settings.S3_ACCESS_KEY
        self.secret_key = secret_key if secret_key is not None else settings.S3_SECRET_KEY
        self.region = region if region is not None else settings.S3_REGION
        self._client = None

    def _obter_client(self):
        if self._client is None:
            try:
                import boto3  # type: ignore[import-not-found]
            except ImportError as exc:
                raise RuntimeError(
                    "A biblioteca 'boto3' é necessária para utilizar STORAGE_BACKEND=s3."
                ) from exc

            kwargs: dict = {
                "service_name": "s3",
                "region_name": self.region or "sa-saopaulo-1",
            }
            if self.endpoint_url:
                kwargs["endpoint_url"] = self.endpoint_url
            if self.access_key and self.secret_key:
                kwargs["aws_access_key_id"] = self.access_key
                kwargs["aws_secret_access_key"] = self.secret_key
            self._client = boto3.client(**kwargs)
        return self._client

    def salvar(self, conteudo: bytes, chave: str, mime_type: str) -> str:
        chave_limpa = str(chave).lstrip("/")
        client = self._obter_client()
        client.put_object(
            Bucket=self.bucket,
            Key=chave_limpa,
            Body=conteudo,
            ContentType=mime_type,
        )
        return chave_limpa

    def abrir(self, chave: str) -> bytes:
        chave_limpa = str(chave).lstrip("/")
        client = self._obter_client()
        try:
            resposta = client.get_object(Bucket=self.bucket, Key=chave_limpa)
            return resposta["Body"].read()
        except Exception as exc:
            raise FileNotFoundError(f"Arquivo não encontrado no bucket S3: {chave_limpa}") from exc

    def excluir(self, chave: str) -> None:
        if not chave:
            return
        chave_limpa = str(chave).lstrip("/")
        client = self._obter_client()
        try:
            client.delete_object(Bucket=self.bucket, Key=chave_limpa)
        except Exception:
            pass


_storage_instance: StorageService | None = None


def get_storage_service() -> StorageService:
    """Retorna a instância configurada do StorageService (LocalStorage ou S3Storage)."""
    global _storage_instance
    if _storage_instance is None:
        if settings.STORAGE_BACKEND.strip().lower() == "s3":
            _storage_instance = S3Storage()
        else:
            _storage_instance = LocalStorage()
    return _storage_instance
