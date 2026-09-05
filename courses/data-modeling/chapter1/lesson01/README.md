# Lesson 1: The Shape of Data at Ingestion

### The Story: Day 1 on the Ingestion Pipeline

Welcome to the BaseLayer engineering team!

Your first assignment is fixing the course synchronization pipeline. When authors create or update interactive courses on BaseLayer, our synchronization worker pulls their content from disk or GitHub and routes it into the platform.

Yesterday evening, the worker crashed with an unhandled exception:
```
TypeError: Cannot insert binary payload into relational column 'description'
JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

Investigation revealed the root cause: **the ingestion pipeline treated all incoming files identically.** When an author pushed a package containing:
1. Tabular database rows (`User` profiles),
2. Hierarchical configuration objects (`metadata.json`), and
3. Raw instruction guides (`README.md`) alongside diagram images (`question.png`),

the worker blindly attempted to parse binary images as JSON and insert nested dictionaries into flat relational columns.

---

### The Data Modeling Concept: Data Shapes

Before you design tables or choose storage engines, the foundational step of data modeling is **identifying the structural shape of your data**:

| Shape | Internal Structure | Schema Flexibility | Real-World BaseLayer Example | Primary Storage Destination |
|---|---|---|---|---|
| **Structured** | Fixed schema of atomic scalar fields (strings, ints, floats, bools). | Strict & rigid | `User` profile row (`id`, `username`, `email`) | Relational DB (RDS / SQLite) |
| **Semi-Structured** | Hierarchical key-value tree containing nested dictionaries or arrays. | Dynamic & extensible | `metadata.json` (`{"exercise_type": "drawing", "tools": [...]}`) | Document store (Datastore, DynamoDB, MongoDB) |
| **Unstructured** | Raw sequence of characters or bytes without internal machine schema. | None (raw content) | `README.md` text, `question.png` canvas diagram | Object storage (S3 / GCS) |

If you route unstructured binary data to a relational table, you face memory bloat and connection throttling. If you force semi-structured nested documents into flat 1NF relational tables, you create explosive schema migrations and join complexity.

---

### The Problem We Need to Solve

We must build an automated **data shape classifier** at the entry boundary of BaseLayer's ingestion worker. Before any byte is persisted, the classifier must inspect the object and identify its category so our router can send it to the right engine.

#### Business Rules:
1. **Unstructured:** Any string (`str`) or raw byte stream (`bytes`).
2. **Semi-Structured:** Any dictionary (`dict`) where at least one value is itself a nested `dict` or `list`.
3. **Structured:** Any dictionary (`dict`) containing **only** flat, scalar values (strings, numbers, booleans, etc.).
4. **Invalid Payloads:** If an unsupported type is provided (e.g. integer primitives or raw root lists), raise a `TypeError`.

---

### Your Task

- [ ] Implement `classify(value)` in `main.py`
- [ ] Return `"unstructured"` if `value` is a `str` or `bytes`
- [ ] Return `"semi-structured"` if `value` is a `dict` with any nested `dict` or `list` values
- [ ] Return `"structured"` if `value` is a `dict` with only scalar values
- [ ] Raise `TypeError` for all other data types

---

### Example

```py
# Structured record
classify({"id": 1, "username": "soto", "email": "soto@example.com"})
# => "structured"

# Semi-structured configuration
classify({"slug": "lesson01", "metadata": {"exercise_type": "code"}})
# => "semi-structured"

# Unstructured assets
classify("# Chapter 1: Foundations\nWelcome...")
# => "unstructured"
classify(b"\x89PNG\r\n\x1a\n...")
# => "unstructured"
```
