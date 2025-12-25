"""Health endpoint tests."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint_returns_200(client: AsyncClient) -> None:
    """Test that health endpoint returns 200 OK."""
    response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_endpoint_returns_correct_structure(client: AsyncClient) -> None:
    """Test that health endpoint returns correct JSON structure."""
    response = await client.get("/health")
    data = response.json()

    assert "status" in data
    assert "version" in data
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_root_endpoint_returns_200(client: AsyncClient) -> None:
    """Test that root endpoint returns 200 OK."""
    response = await client.get("/")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_root_endpoint_contains_docs_link(client: AsyncClient) -> None:
    """Test that root endpoint contains link to docs."""
    response = await client.get("/")
    data = response.json()

    assert "docs" in data
    assert data["docs"] == "/docs"
