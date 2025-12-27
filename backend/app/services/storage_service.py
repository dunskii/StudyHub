"""Storage service for Digital Ocean Spaces (S3-compatible).

Provides file upload, download, and management with presigned URLs.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class StorageError(Exception):
    """Base exception for storage operations."""

    pass


class StorageService:
    """Service for managing file storage on Digital Ocean Spaces."""

    def __init__(self) -> None:
        """Initialize the S3-compatible client for DO Spaces."""
        settings = get_settings()

        self._bucket = settings.do_spaces_bucket
        self._region = settings.do_spaces_region
        self._endpoint = settings.do_spaces_url
        self._expiry = settings.note_presigned_url_expiry

        # Initialize boto3 client with DO Spaces credentials
        self._client = boto3.client(
            "s3",
            region_name=self._region,
            endpoint_url=self._endpoint,
            aws_access_key_id=settings.do_spaces_key,
            aws_secret_access_key=settings.do_spaces_secret,
            config=Config(signature_version="s3v4"),
        )

    def generate_storage_key(
        self,
        student_id: uuid.UUID,
        filename: str,
        prefix: str = "notes",
    ) -> str:
        """Generate a unique storage key for a file.

        Pattern: {prefix}/{student_id}/{year}/{month}/{uuid}.{ext}

        Args:
            student_id: The student's UUID.
            filename: Original filename to extract extension.
            prefix: Storage prefix (default: 'notes').

        Returns:
            Unique storage key.
        """
        now = datetime.now(timezone.utc)
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
        unique_id = uuid.uuid4()

        return f"{prefix}/{student_id}/{now.year}/{now.month:02d}/{unique_id}.{ext}"

    def generate_thumbnail_key(self, storage_key: str) -> str:
        """Generate a thumbnail key from a storage key.

        Args:
            storage_key: Original storage key.

        Returns:
            Thumbnail storage key.
        """
        parts = storage_key.rsplit(".", 1)
        if len(parts) == 2:
            return f"{parts[0]}_thumb.{parts[1]}"
        return f"{storage_key}_thumb"

    async def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        expires_in: int | None = None,
    ) -> dict[str, Any]:
        """Generate a presigned URL for direct browser upload.

        Args:
            key: Storage key for the file.
            content_type: MIME type of the file.
            expires_in: URL expiry in seconds (default from settings).

        Returns:
            Dict with 'url' and 'fields' for POST upload.

        Raises:
            StorageError: If URL generation fails.
        """
        try:
            response = self._client.generate_presigned_post(
                Bucket=self._bucket,
                Key=key,
                Fields={"Content-Type": content_type},
                Conditions=[
                    {"Content-Type": content_type},
                    ["content-length-range", 1, 10 * 1024 * 1024],  # 1 byte to 10MB
                ],
                ExpiresIn=expires_in or self._expiry,
            )

            logger.info(f"Generated presigned upload URL for key: {key}")
            return response

        except ClientError as e:
            logger.error(f"Failed to generate presigned upload URL: {e}")
            raise StorageError(f"Failed to generate upload URL: {e}") from e

    async def generate_presigned_download_url(
        self,
        key: str,
        expires_in: int | None = None,
    ) -> str:
        """Generate a presigned URL for file download.

        Args:
            key: Storage key for the file.
            expires_in: URL expiry in seconds (default from settings).

        Returns:
            Signed URL for GET request.

        Raises:
            StorageError: If URL generation fails.
        """
        try:
            url = self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket, "Key": key},
                ExpiresIn=expires_in or self._expiry,
            )

            return url

        except ClientError as e:
            logger.error(f"Failed to generate presigned download URL: {e}")
            raise StorageError(f"Failed to generate download URL: {e}") from e

    async def upload_file(
        self,
        key: str,
        file_data: bytes,
        content_type: str,
    ) -> str:
        """Upload a file to storage (server-side upload).

        Args:
            key: Storage key for the file.
            file_data: File content as bytes.
            content_type: MIME type of the file.

        Returns:
            Public URL of the uploaded file.

        Raises:
            StorageError: If upload fails.
        """
        try:
            self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=file_data,
                ContentType=content_type,
                ACL="private",
            )

            logger.info(f"Uploaded file to storage: {key}")
            return f"{self._endpoint}/{self._bucket}/{key}"

        except ClientError as e:
            logger.error(f"Failed to upload file: {e}")
            raise StorageError(f"Failed to upload file: {e}") from e

    async def download_file(self, key: str) -> bytes:
        """Download a file from storage.

        Args:
            key: Storage key for the file.

        Returns:
            File content as bytes.

        Raises:
            StorageError: If download fails.
        """
        try:
            response = self._client.get_object(Bucket=self._bucket, Key=key)
            return response["Body"].read()

        except ClientError as e:
            logger.error(f"Failed to download file: {e}")
            raise StorageError(f"Failed to download file: {e}") from e

    async def delete_file(self, key: str) -> bool:
        """Delete a file from storage.

        Args:
            key: Storage key for the file.

        Returns:
            True if deleted, False if not found.

        Raises:
            StorageError: If deletion fails.
        """
        try:
            self._client.delete_object(Bucket=self._bucket, Key=key)
            logger.info(f"Deleted file from storage: {key}")
            return True

        except ClientError as e:
            if e.response.get("Error", {}).get("Code") == "NoSuchKey":
                logger.warning(f"File not found for deletion: {key}")
                return False
            logger.error(f"Failed to delete file: {e}")
            raise StorageError(f"Failed to delete file: {e}") from e

    async def file_exists(self, key: str) -> bool:
        """Check if a file exists in storage.

        Args:
            key: Storage key for the file.

        Returns:
            True if file exists, False otherwise.
        """
        try:
            self._client.head_object(Bucket=self._bucket, Key=key)
            return True
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") == "404":
                return False
            logger.error(f"Failed to check file existence: {e}")
            return False

    async def get_file_metadata(self, key: str) -> dict[str, Any] | None:
        """Get metadata for a file.

        Args:
            key: Storage key for the file.

        Returns:
            Dict with ContentType, ContentLength, LastModified, or None if not found.
        """
        try:
            response = self._client.head_object(Bucket=self._bucket, Key=key)
            return {
                "content_type": response.get("ContentType"),
                "content_length": response.get("ContentLength"),
                "last_modified": response.get("LastModified"),
                "etag": response.get("ETag"),
            }
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") == "404":
                return None
            logger.error(f"Failed to get file metadata: {e}")
            return None


# Singleton instance
_storage_service: StorageService | None = None


def get_storage_service() -> StorageService:
    """Get the storage service singleton.

    Returns:
        StorageService instance.
    """
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
