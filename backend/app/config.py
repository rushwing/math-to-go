"""Application configuration via pydantic-settings — reads from .env."""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # LLM
    anthropic_api_key: str = Field(default="changeme")
    llm_model: str = Field(default="claude-sonnet-4-6")
    llm_temperature: float = Field(default=0.1)
    llm_max_tokens: int = Field(default=8192)

    # Embedding / Reranker
    embedding_model: str = Field(default="BAAI/bge-m3")
    reranker_model: str = Field(default="BAAI/bge-reranker-v2-m3")
    reranker_top_k: int = Field(default=5)

    # Vector Store
    vector_store_type: str = Field(default="chroma")
    chroma_persist_dir: str = Field(default="./knowledge_base/vector_store")
    qdrant_url: str = Field(default="http://localhost:6333")
    qdrant_collection_knowledge: str = Field(default="math_kb_knowledge")
    qdrant_collection_practice: str = Field(default="math_kb_practice")

    # Neo4j
    neo4j_uri: str = Field(default="bolt://localhost:7687")
    neo4j_user: str = Field(default="neo4j")
    neo4j_password: str = Field(default="math-to-go-dev")
    neo4j_database: str = Field(default="neo4j")

    # Retrieval
    hybrid_dense_top_k: int = Field(default=10)
    hybrid_sparse_top_k: int = Field(default=10)
    rrf_k: int = Field(default=60)
    colbert_match_threshold: float = Field(default=0.75)

    # Chunking
    chunk_size: int = Field(default=800)
    chunk_overlap: int = Field(default=100)

    # Ebbinghaus (UC-4)
    mastery_threshold: int = Field(default=3)
    ebbinghaus_intervals: str = Field(default="1,2,4,7,15,30")

    # API server
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)
    api_reload: bool = Field(default=True)
    cors_origins: str = Field(default="http://localhost:5173")

    # KB
    kb_docs_dir: str = Field(default="./knowledge_base/docs")
    kb_raw_dir: str = Field(default="./knowledge_base/raw")

    # LangSmith (optional)
    langchain_tracing_v2: bool = Field(default=False)
    langchain_api_key: str = Field(default="")
    langchain_project: str = Field(default="math-to-go")

    # Logging
    log_level: str = Field(default="INFO")
    log_dir: str = Field(default="./logs")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


settings = Settings()
