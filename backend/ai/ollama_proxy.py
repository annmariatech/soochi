"""Token-protected local gateway from a Cloudflare Tunnel to Ollama."""

import hmac
import os
from collections.abc import AsyncIterator

import httpx
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse


app = FastAPI(title="Soochi Ollama Gateway", docs_url=None, redoc_url=None)

OLLAMA_LOCAL_HOST = os.getenv("OLLAMA_LOCAL_HOST", "http://127.0.0.1:11434").rstrip("/")
ALLOWED_ENDPOINTS = {
    ("GET", "/api/tags"),
    ("GET", "/api/version"),
    ("POST", "/api/show"),
    ("POST", "/api/chat"),
    ("POST", "/api/generate"),
    ("POST", "/api/embed"),
    ("POST", "/api/embeddings"),
}
REQUEST_HEADERS = {"content-type", "accept"}
RESPONSE_HEADERS = {"content-type", "cache-control"}


@app.api_route("/{path:path}", methods=["GET", "POST"])
async def proxy_ollama(path: str, request: Request) -> Response:
    """Authenticate a request and stream an allowed Ollama API response."""
    expected_token = os.getenv("OLLAMA_PROXY_TOKEN", "").strip()
    if not expected_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ollama gateway token is not configured",
        )

    supplied_auth = request.headers.get("authorization", "")
    expected_auth = f"Bearer {expected_token}"
    if not hmac.compare_digest(supplied_auth, expected_auth):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    endpoint = f"/{path}"
    if (request.method, endpoint) not in ALLOWED_ENDPOINTS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ollama endpoint not allowed")

    query = request.url.query
    upstream_url = f"{OLLAMA_LOCAL_HOST}{endpoint}"
    if query:
        upstream_url = f"{upstream_url}?{query}"

    headers = {key: value for key, value in request.headers.items() if key.lower() in REQUEST_HEADERS}
    body = await request.body() if request.method == "POST" else None
    client = httpx.AsyncClient(timeout=httpx.Timeout(180.0, connect=10.0))

    try:
        upstream_request = client.build_request(
            request.method,
            upstream_url,
            headers=headers,
            content=body,
        )
        upstream_response = await client.send(upstream_request, stream=True)
    except httpx.RequestError as exc:
        await client.aclose()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach local Ollama",
        ) from exc

    response_headers = {
        key: value
        for key, value in upstream_response.headers.items()
        if key.lower() in RESPONSE_HEADERS
    }

    async def stream_body() -> AsyncIterator[bytes]:
        try:
            async for chunk in upstream_response.aiter_bytes():
                yield chunk
        finally:
            await upstream_response.aclose()
            await client.aclose()

    return StreamingResponse(
        stream_body(),
        status_code=upstream_response.status_code,
        headers=response_headers,
    )
