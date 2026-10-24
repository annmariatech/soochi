"""Small persistent retrieval and suitability module for fabric guidance."""

import json
import logging
import os
from pathlib import Path
from typing import Any

import chromadb

from backend.ai.ollama_client import create_ollama_client


logger = logging.getLogger(__name__)
EMBED_MODEL = "nomic-embed-text"
CHAT_MODEL = "gemma3:4b"
COLLECTION_NAME = "fabric_kb"
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
SNIPPETS_PATH = Path(os.getenv("SOOCHI_KB_PATH", DATA_DIR / "kb_snippets.json"))
CHROMA_PATH = Path(os.getenv("SOOCHI_CHROMA_PATH", DATA_DIR / "chroma"))


def _collection():
    client = chromadb.PersistentClient(path=str(CHROMA_PATH))
    return client.get_or_create_collection(name=COLLECTION_NAME)


def _embed(text: str) -> list[float]:
    result = create_ollama_client().embed(model=EMBED_MODEL, input=text)
    return result["embeddings"][0]


def build_index() -> int:
    """Read KB snippets, embed them, and upsert into persistent ChromaDB.

    Returns the number of snippets indexed. Snippet IDs are stable, so running
    this again updates existing entries rather than creating duplicates.
    """
    with SNIPPETS_PATH.open(encoding="utf-8") as file:
        snippets = json.load(file)
    if not isinstance(snippets, list):
        raise ValueError(f"Expected a JSON array of snippets in {SNIPPETS_PATH}")

    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[dict[str, str]] = []
    embeddings: list[list[float]] = []
    for snippet in snippets:
        if not all(key in snippet for key in ("id", "topic", "text")):
            raise ValueError("Each KB snippet must contain id, topic, and text")
        ids.append(str(snippet["id"]))
        documents.append(str(snippet["text"]))
        metadatas.append({"topic": str(snippet["topic"])})
        embeddings.append(_embed(str(snippet["text"])))

    if ids:
        _collection().upsert(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)
    return len(ids)


def retrieve(query: str, k: int = 3, topic: str | None = None) -> list[dict[str, Any]]:
    """Return the nearest snippets, optionally restricted to one topic."""
    if k < 1:
        return []
    collection = _collection()
    if collection.count() == 0:
        return []
    options: dict[str, Any] = {
        "query_embeddings": [_embed(query)],
        "n_results": min(k, collection.count()),
        "include": ["documents", "metadatas", "distances"],
    }
    if topic is not None:
        options["where"] = {"topic": topic}
    result = collection.query(**options)
    ids = result.get("ids", [[]])[0]
    documents = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]
    return [
        {"id": snippet_id, "topic": metadata.get("topic", ""), "text": text, "distance": distance}
        for snippet_id, text, metadata, distance in zip(ids, documents, metadatas, distances)
    ]


def check_suitability(product_name: str, tags: dict[str, Any]) -> dict[str, Any]:
    """Assess a product using only retrieved snippets; include source IDs."""
    try:
        sources = retrieve(f"Suitability of {product_name}; fabric details: {json.dumps(tags, sort_keys=True)}")
        if not sources:
            return {"suitable": True, "reason": "Guidance unavailable", "sources": []}

        source_text = "\n".join(f"[{item['id']}] {item['text']}" for item in sources)
        response = create_ollama_client().chat(
            model=CHAT_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Assess fabric suitability using ONLY the supplied snippets and fabric tags. "
                        "Do not use outside knowledge. In reason, cite supporting snippet IDs in square "
                        "brackets, for example [snippet-1]. If the snippets do not support a conclusion, "
                        "say so and cite the relevant snippet IDs. Return JSON with boolean suitable and string reason."
                    ),
                },
                {"role": "user", "content": f"Product: {product_name}\nFabric tags: {json.dumps(tags, sort_keys=True)}\nRetrieved snippets:\n{source_text}"},
            ],
            format="json",
            options={"temperature": 0},
        )
        verdict = json.loads(response.message.content)
        if not isinstance(verdict.get("suitable"), bool) or not isinstance(verdict.get("reason"), str):
            raise ValueError("Ollama response must contain boolean suitable and string reason")
        return {"suitable": verdict["suitable"], "reason": verdict["reason"], "sources": sources}
    except Exception:
        logger.exception("Could not assess suitability for %s", product_name)
        return {"suitable": True, "reason": "Guidance unavailable", "sources": []}
