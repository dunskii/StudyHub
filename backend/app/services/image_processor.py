"""Image processing service for note uploads.

Handles image validation, resizing, and thumbnail generation.
"""
from __future__ import annotations

import io
import logging
from dataclasses import dataclass
from typing import BinaryIO

from PIL import Image, ImageOps

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class ImageProcessingError(Exception):
    """Exception for image processing errors."""

    pass


@dataclass
class ImageMetadata:
    """Metadata extracted from an image."""

    width: int
    height: int
    format: str
    mode: str
    size_bytes: int
    has_transparency: bool


class ImageProcessor:
    """Service for processing uploaded images."""

    # Supported image formats
    SUPPORTED_FORMATS = {"JPEG", "PNG", "WEBP", "HEIC", "HEIF"}

    # Format mappings for saving
    FORMAT_MAP = {
        "HEIC": "JPEG",
        "HEIF": "JPEG",
    }

    def __init__(self) -> None:
        """Initialize the image processor with settings."""
        settings = get_settings()
        self._max_dimension = settings.note_max_dimension
        self._thumbnail_size = settings.note_thumbnail_size
        self._max_file_size = settings.note_max_file_size_mb * 1024 * 1024

    def validate_image(self, file_data: bytes) -> ImageMetadata:
        """Validate an image file.

        Args:
            file_data: Raw image bytes.

        Returns:
            ImageMetadata with image properties.

        Raises:
            ImageProcessingError: If validation fails.
        """
        # Check file size
        if len(file_data) > self._max_file_size:
            raise ImageProcessingError(
                f"File size exceeds maximum of {self._max_file_size // (1024 * 1024)}MB"
            )

        if len(file_data) == 0:
            raise ImageProcessingError("Empty file")

        try:
            with Image.open(io.BytesIO(file_data)) as img:
                format_name = img.format or "UNKNOWN"

                # Check format
                if format_name.upper() not in self.SUPPORTED_FORMATS:
                    raise ImageProcessingError(
                        f"Unsupported image format: {format_name}. "
                        f"Supported: {', '.join(self.SUPPORTED_FORMATS)}"
                    )

                return ImageMetadata(
                    width=img.width,
                    height=img.height,
                    format=format_name,
                    mode=img.mode,
                    size_bytes=len(file_data),
                    has_transparency=img.mode in ("RGBA", "LA", "P"),
                )

        except Image.UnidentifiedImageError as e:
            raise ImageProcessingError(f"Cannot identify image file: {e}") from e
        except Exception as e:
            raise ImageProcessingError(f"Error validating image: {e}") from e

    def resize_for_ocr(self, file_data: bytes) -> bytes:
        """Resize image for OCR processing.

        Resizes to max 2048px on longest side while maintaining aspect ratio.

        Args:
            file_data: Raw image bytes.

        Returns:
            Resized image as JPEG bytes.

        Raises:
            ImageProcessingError: If processing fails.
        """
        try:
            with Image.open(io.BytesIO(file_data)) as img:
                # Convert to RGB if necessary (for JPEG output)
                if img.mode in ("RGBA", "LA", "P"):
                    # Create white background for transparency
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    if img.mode == "P":
                        img = img.convert("RGBA")
                    background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
                    img = background
                elif img.mode != "RGB":
                    img = img.convert("RGB")

                # Auto-orient based on EXIF
                img = ImageOps.exif_transpose(img)

                # Check if resize needed
                max_side = max(img.width, img.height)
                if max_side > self._max_dimension:
                    ratio = self._max_dimension / max_side
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    img = img.resize(new_size, Image.Resampling.LANCZOS)

                # Save as JPEG
                output = io.BytesIO()
                img.save(output, format="JPEG", quality=85, optimize=True)
                output.seek(0)

                logger.info(
                    f"Resized image for OCR: {img.width}x{img.height} "
                    f"({len(output.getvalue())} bytes)"
                )

                return output.getvalue()

        except Exception as e:
            raise ImageProcessingError(f"Error resizing image for OCR: {e}") from e

    def create_thumbnail(self, file_data: bytes) -> bytes:
        """Create a thumbnail from an image.

        Creates a square thumbnail cropped from center.

        Args:
            file_data: Raw image bytes.

        Returns:
            Thumbnail as JPEG bytes.

        Raises:
            ImageProcessingError: If processing fails.
        """
        try:
            with Image.open(io.BytesIO(file_data)) as img:
                # Convert to RGB if necessary
                if img.mode in ("RGBA", "LA", "P"):
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    if img.mode == "P":
                        img = img.convert("RGBA")
                    background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
                    img = background
                elif img.mode != "RGB":
                    img = img.convert("RGB")

                # Auto-orient based on EXIF
                img = ImageOps.exif_transpose(img)

                # Create square thumbnail using center crop
                img = ImageOps.fit(
                    img,
                    (self._thumbnail_size, self._thumbnail_size),
                    method=Image.Resampling.LANCZOS,
                )

                # Save as JPEG
                output = io.BytesIO()
                img.save(output, format="JPEG", quality=80, optimize=True)
                output.seek(0)

                logger.info(
                    f"Created thumbnail: {self._thumbnail_size}x{self._thumbnail_size} "
                    f"({len(output.getvalue())} bytes)"
                )

                return output.getvalue()

        except Exception as e:
            raise ImageProcessingError(f"Error creating thumbnail: {e}") from e

    def get_content_type(self, file_data: bytes) -> str:
        """Get the MIME type of an image.

        Args:
            file_data: Raw image bytes.

        Returns:
            MIME type string.
        """
        try:
            with Image.open(io.BytesIO(file_data)) as img:
                format_name = img.format or "JPEG"
                # Map to MIME types
                mime_types = {
                    "JPEG": "image/jpeg",
                    "PNG": "image/png",
                    "WEBP": "image/webp",
                    "GIF": "image/gif",
                    "HEIC": "image/heic",
                    "HEIF": "image/heif",
                }
                return mime_types.get(format_name.upper(), "application/octet-stream")
        except Exception:
            return "application/octet-stream"


# Singleton instance
_image_processor: ImageProcessor | None = None


def get_image_processor() -> ImageProcessor:
    """Get the image processor singleton.

    Returns:
        ImageProcessor instance.
    """
    global _image_processor
    if _image_processor is None:
        _image_processor = ImageProcessor()
    return _image_processor
