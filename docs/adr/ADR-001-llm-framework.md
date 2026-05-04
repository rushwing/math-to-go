# ADR-001: Agent Orchestration Framework

## Decision

Use **LangGraph 0.2+** as the agent orchestration framework.

---

## Finalists Compared

| Criteria | LangGraph | LlamaIndex Workflows | Haystack Pipelines | Raw Anthropic SDK |
|----------|-----------|---------------------|--------------------|-------------------|
| **Graph-based control flow** | ✅ StateGraph with conditional edges | ✅ Event-driven steps | ✅ Linear pipeline | ❌ Manual |
| **Streaming (SSE tokens)** | ✅ `astream_events` native | ⚠️ Requires wrapper | ⚠️ Generator-based | ✅ Native stream |
| **State management** | ✅ TypedDict AgentState | ✅ Context object | ⚠️ Component outputs only | ❌ Manual |
| **Neo4j / Graph RAG** | ✅ `langchain-neo4j` integrated | ⚠️ Plugin needed | ⚠️ Custom component | ❌ Manual |
| **Conditional routing** | ✅ First-class (add_conditional_edges) | ⚠️ If/else in steps | ⚠️ Router component | ❌ Manual |
| **Cycle / loop support** | ✅ Built-in | ⚠️ Limited | ❌ DAG only | ❌ Manual |
| **LangSmith observability** | ✅ Native trace | ⚠️ Partial | ❌ Separate tooling | ❌ Manual |
| **Community & docs** | ✅ Large, active (2024-2026) | ✅ Large | ⚠️ Smaller | ✅ Authoritative |
| **Learning curve** | Medium | Medium | Low | Low |

---

## Why LangGraph is Best Fit

1. **Typed AgentState** allows each node to read/write named fields cleanly, preventing node coupling and enabling partial-state streaming.
2. **Conditional edges** handle the intent routing gate (`review` → reviewer node, `generate` → problem_generator, etc.) without nested if/else in application code.
3. **astream_events** yields per-node token streams that map directly to SSE event types consumed by the frontend.
4. **langchain-neo4j** and **langchain-chroma** are first-class LangChain integrations — LangGraph inherits all of them with no glue code.
5. The Ebbinghaus practice loop (UC-4) benefits from LangGraph's native cycle/interrupt support.

---

## Trade-offs

| Trade-off | Impact |
|-----------|--------|
| LangGraph ties us to the LangChain ecosystem | Low risk — LangChain is the dominant Python LLM framework; any future migration would be mechanical |
| More boilerplate than a single LLM call | Justified — 4 distinct pipelines (review/generate/grade/drill) with shared state would be unmanageable without graph structure |
| LangGraph API surface changes between minor versions | Pin to `langraph==0.2.*` in pyproject.toml; review changelog before upgrading |
| LangSmith tracing is opt-in but adds cost at scale | Disabled by default (`LANGCHAIN_TRACING_V2=false`); enable per-session for debugging only |
