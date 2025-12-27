"""OCR service using Google Cloud Vision API.

Provides text extraction from images with confidence scores and language detection.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class OCRError(Exception):
    """Exception for OCR processing errors."""

    pass


@dataclass
class TextBlock:
    """A block of text extracted from an image."""

    text: str
    confidence: float
    block_type: str  # TEXT, TABLE, PICTURE
    bounding_box: dict[str, Any] | None = None


@dataclass
class OCRResult:
    """Result of OCR text extraction."""

    text: str
    confidence: float
    language: str
    blocks: list[TextBlock] = field(default_factory=list)
    error: str | None = None

    @property
    def success(self) -> bool:
        """Check if OCR was successful."""
        return self.error is None and len(self.text) > 0


class OCRService:
    """Service for extracting text from images using Google Cloud Vision."""

    def __init__(self) -> None:
        """Initialize the Google Cloud Vision client."""
        settings = get_settings()
        self._enabled = settings.ocr_enabled
        self._client = None

        if self._enabled:
            try:
                from google.cloud import vision

                # Use default credentials (GOOGLE_APPLICATION_CREDENTIALS env var)
                self._client = vision.ImageAnnotatorClient()
                logger.info("Google Cloud Vision client initialized")
            except ImportError:
                logger.warning(
                    "google-cloud-vision not installed. OCR will be disabled."
                )
                self._enabled = False
            except Exception as e:
                logger.error(f"Failed to initialize Vision client: {e}")
                self._enabled = False

    @property
    def is_enabled(self) -> bool:
        """Check if OCR service is enabled and available."""
        return self._enabled and self._client is not None

    async def extract_text(self, image_data: bytes) -> OCRResult:
        """Extract text from image bytes.

        Uses document_text_detection for better handwriting recognition.

        Args:
            image_data: Raw image bytes.

        Returns:
            OCRResult with extracted text and metadata.
        """
        if not self.is_enabled:
            return OCRResult(
                text="",
                confidence=0.0,
                language="unknown",
                error="OCR service is not available",
            )

        try:
            from google.cloud import vision

            image = vision.Image(content=image_data)

            # Use document_text_detection for better results with handwriting
            response = self._client.document_text_detection(image=image)

            if response.error.message:
                logger.error(f"Vision API error: {response.error.message}")
                return OCRResult(
                    text="",
                    confidence=0.0,
                    language="unknown",
                    error=response.error.message,
                )

            # Extract full text
            full_text = ""
            if response.full_text_annotation:
                full_text = response.full_text_annotation.text

            # Calculate average confidence and extract blocks
            confidence = 0.0
            block_count = 0
            blocks: list[TextBlock] = []

            if response.full_text_annotation:
                for page in response.full_text_annotation.pages:
                    for block in page.blocks:
                        block_confidence = block.confidence
                        confidence += block_confidence
                        block_count += 1

                        # Extract block text
                        block_text = ""
                        for paragraph in block.paragraphs:
                            for word in paragraph.words:
                                word_text = "".join(
                                    symbol.text for symbol in word.symbols
                                )
                                block_text += word_text + " "

                        # Get bounding box
                        vertices = block.bounding_box.vertices
                        bounding_box = {
                            "vertices": [
                                {"x": v.x, "y": v.y} for v in vertices
                            ]
                        } if vertices else None

                        blocks.append(
                            TextBlock(
                                text=block_text.strip(),
                                confidence=block_confidence,
                                block_type=vision.Block.BlockType(
                                    block.block_type
                                ).name,
                                bounding_box=bounding_box,
                            )
                        )

            avg_confidence = confidence / block_count if block_count > 0 else 0.0

            # Detect language
            language = "en"
            if response.full_text_annotation and response.full_text_annotation.pages:
                page = response.full_text_annotation.pages[0]
                if page.property and page.property.detected_languages:
                    language = page.property.detected_languages[0].language_code

            logger.info(
                f"OCR extracted {len(full_text)} characters with "
                f"{avg_confidence:.2%} confidence (language: {language})"
            )

            return OCRResult(
                text=full_text,
                confidence=avg_confidence,
                language=language,
                blocks=blocks,
            )

        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return OCRResult(
                text="",
                confidence=0.0,
                language="unknown",
                error=str(e),
            )

    async def extract_from_url(self, image_url: str) -> OCRResult:
        """Extract text from an image URL.

        Args:
            image_url: URL of the image (must be publicly accessible).

        Returns:
            OCRResult with extracted text and metadata.
        """
        if not self.is_enabled:
            return OCRResult(
                text="",
                confidence=0.0,
                language="unknown",
                error="OCR service is not available",
            )

        try:
            from google.cloud import vision

            image = vision.Image()
            image.source.image_uri = image_url

            response = self._client.document_text_detection(image=image)

            if response.error.message:
                return OCRResult(
                    text="",
                    confidence=0.0,
                    language="unknown",
                    error=response.error.message,
                )

            # Extract full text (simplified for URL-based)
            full_text = ""
            if response.full_text_annotation:
                full_text = response.full_text_annotation.text

            return OCRResult(
                text=full_text,
                confidence=0.9,  # Simplified confidence for URL-based
                language="en",
                blocks=[],
            )

        except Exception as e:
            logger.error(f"OCR from URL failed: {e}")
            return OCRResult(
                text="",
                confidence=0.0,
                language="unknown",
                error=str(e),
            )


class MockOCRService(OCRService):
    """Mock OCR service for testing without Google Cloud credentials."""

    def __init__(self, mock_text: str = "Mock OCR text", mock_confidence: float = 0.95) -> None:
        """Initialize mock service with configurable responses.

        Args:
            mock_text: Text to return for all OCR requests.
            mock_confidence: Confidence score to return.
        """
        self._mock_text = mock_text
        self._mock_confidence = mock_confidence
        self._enabled = True
        self._client = None

    @property
    def is_enabled(self) -> bool:
        """Mock is always enabled."""
        return True

    async def extract_text(self, image_data: bytes) -> OCRResult:
        """Return mock OCR result.

        Args:
            image_data: Ignored in mock.

        Returns:
            Mock OCRResult.
        """
        return OCRResult(
            text=self._mock_text,
            confidence=self._mock_confidence,
            language="en",
            blocks=[
                TextBlock(
                    text=self._mock_text,
                    confidence=self._mock_confidence,
                    block_type="TEXT",
                )
            ],
        )

    async def extract_from_url(self, image_url: str) -> OCRResult:
        """Return mock OCR result.

        Args:
            image_url: Ignored in mock.

        Returns:
            Mock OCRResult.
        """
        return await self.extract_text(b"")


# Singleton instance
_ocr_service: OCRService | None = None


def get_ocr_service() -> OCRService:
    """Get the OCR service singleton.

    Returns:
        OCRService instance.
    """
    global _ocr_service
    if _ocr_service is None:
        settings = get_settings()
        if settings.environment == "development" and not settings.google_application_credentials:
            logger.info("Using MockOCRService for development")
            _ocr_service = MockOCRService()
        else:
            _ocr_service = OCRService()
    return _ocr_service
