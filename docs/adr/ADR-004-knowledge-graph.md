# ADR-004: Knowledge Graph Database

## Decision

Use **Neo4j Community Edition 5.x** as the knowledge graph database.

---

## Finalists Compared

| Criteria | Neo4j Community | NetworkX | ArangoDB | Kuzu (archived) |
|----------|----------------|---------|---------|----------------|
| **Query language** | Cypher (industry standard) | Python API only | AQL (custom) | Cypher-compatible |
| **LangChain integration** | ✅ Full — `Neo4jGraph`, `GraphCypherQAChain`, `Neo4jVector` | ⚠️ Basic — graph manipulation only | ❌ Custom integration required | ⚠️ Community interest, unmaintained |
| **Persistence** | ✅ Disk-backed | ❌ In-memory only | ✅ | ✅ |
| **Local deployment** | ✅ Docker (single container) | ✅ Pure Python | ✅ Docker | ✅ Embedded (pip) |
| **Vector index** | ✅ Built-in (v5.11+) | ❌ | ⚠️ Plugin | ⚠️ Experimental |
| **Graph visualization** | ✅ Neo4j Browser | ❌ External tools | ✅ Web UI | ❌ |
| **Learning value** | ✅ Cypher is industry lingua franca | Low (Python-specific) | Medium | — |
| **Community / docs** | ✅ Largest | ✅ Large (Python ML) | ⚠️ Medium | ❌ Archived Oct 2025 |
| **Maintenance status** | ✅ Active | ✅ Active | ✅ Active | ❌ Apple acquisition, archived |
| **License** | GPL-3.0 (Community) | BSD-3 | Apache-2.0 | Apache-2.0 (archived) |

---

## Why Neo4j Community is Best Fit

### Kuzu is ruled out

KuzuDB was acquired by Apple and archived in October 2025. Despite its superior performance (18× faster ingestion than Neo4j for large graphs), using an archived project with no corporate backing is not viable for a learning-focused project that should remain maintainable.

### NetworkX is insufficient for this use case

NetworkX is in-memory only — the knowledge graph is lost on process restart. A student's mistake graph and Ebbinghaus metadata must survive sessions. NetworkX also lacks a native query language, making graph traversal verbose and untestable.

### Neo4j Community Edition is the educational gold standard

1. **Cypher** is the most transferable graph query skill. All major KG tutorials, courses, and job postings reference Cypher.
2. **Neo4j Browser** (included) provides visual graph exploration — invaluable for understanding how concepts connect (e.g., seeing the prerequisite chain for bracket-removal equations).
3. **LangChain's `GraphCypherQAChain`** allows the LLM to write and execute Cypher queries from natural language — this is the key integration for UC-1 (review) and UC-4 (drill context).
4. **Neo4j's built-in vector index** (v5.11+) could eventually unify vector + graph in one store, reducing operational complexity.

---

## Knowledge Graph Schema (for reference)

```cypher
// Nodes
(:Topic {id: STRING, name: STRING, grade: INT, term: INT})
(:Concept {id: STRING, name: STRING, description: STRING})
(:Skill {id: STRING, name: STRING, description: STRING})
(:Problem {doc_id: STRING, difficulty: STRING, subtopic: STRING})
(:Mistake {doc_id: STRING, pattern: STRING, misconception: STRING})

// Indexes
CREATE INDEX topic_id FOR (t:Topic) ON (t.id)
CREATE INDEX concept_id FOR (c:Concept) ON (c.id)
CREATE INDEX problem_doc_id FOR (p:Problem) ON (p.doc_id)

// Relationships
(:Concept)-[:BELONGS_TO]->(:Topic)
(:Concept)-[:PREREQUISITE_OF]->(:Concept)
(:Skill)-[:APPLIES_TO]->(:Concept)
(:Problem)-[:TESTS_SKILL]->(:Skill)
(:Mistake)-[:STEMS_FROM]->(:Concept)
(:Mistake)-[:COMMON_IN]->(:Problem)
```

---

## Trade-offs

| Trade-off | Mitigation |
|-----------|-----------|
| Neo4j requires Docker (adds onboarding step) | `docker-compose.yml` includes Neo4j service; `scripts/local/dev.sh` starts it automatically |
| GPL-3.0 license on Community Edition | Acceptable for this project (not redistributed as a commercial product); Enterprise Edition available if commercialized |
| Graph population requires entity extraction from KB docs | `scripts/build_kg.py` uses Claude to extract entities and relationships from markdown frontmatter + content; runs after `ingest_kb.py` |
| LLM-generated Cypher can be incorrect or inject malicious queries | Use `Neo4jGraph` with `validate_cypher=True` and read-only Neo4j user in dev; all Cypher templates are pre-reviewed in `graph_queries.py` |
| Community Edition lacks clustering | Sufficient for local/single-node deployment; Aura (cloud) or Enterprise available at scale |
