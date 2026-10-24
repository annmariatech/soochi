"""Shared Ollama client configuration for local and tunneled Ollama hosts."""

import os

import ollama


def create_ollama_client(timeout: float = 120.0) -> ollama.Client:
    """Create an Ollama client, adding bearer auth when the proxy token is set."""
    token = os.getenv("OLLAMA_PROXY_TOKEN", "").strip()
    headers = {"Authorization": f"Bearer {token}"} if token else None
    return ollama.Client(
        host=os.getenv("OLLAMA_HOST") or None,
        timeout=timeout,
        headers=headers,
    )
