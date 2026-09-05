# Lesson 1: Cloud Transfer: GCP Transaction Contexts

### The Story: The Multi-Cloud Enterprise Migration

BaseLayer just signed an enterprise contract requiring our platform to deploy on **Google Cloud Platform (GCP)** in addition to AWS.

Our services rely heavily on atomic transactions: publishing forum posts, grading submissions, and updating student enrollments.

In AWS DynamoDB, we wrote declarative dictionary batches:
```python
dynamodb.transact_write_items(TransactItems=[...])
```

When our engineering team opened the Google Cloud SDK (`google-cloud-datastore`), the team was stumped: **there was no `transact_write_items` method.**

Instead, GCP idiomatic code uses Python **context managers**:
```python
with client.transaction() as tx:
    tx.put(thread_entity)
    tx.delete(draft_key)
```

Your mission is to build the GCP local twin, proving that while vendor APIs differ, the underlying data modeling principles of ACID transactions remain universal.

---

### The Data Modeling Concept: Declarative Batches vs. Buffered Contexts

How do different cloud storage engines model transaction boundaries?

* **AWS (Declarative Array):** You construct a full list of actions upfront and send it in a single HTTP POST request. The server validates and executes the batch in one shot.
* **GCP Datastore / Firestore (Transactional Context Manager):** 
  1. Entering the context (`__enter__`) takes a snapshot of the current state and opens a transaction buffer.
  2. Any `put` or `delete` called on `tx` is **buffered client-side**; it is NOT immediately written to the main database. Reads from the client during this window do not yet reflect the buffered writes (Isolation).
  3. When the `with` block exits cleanly (`__exit__` with no exception), the buffer is atomically committed to the data store.
  4. If an unhandled exception occurs inside the block, the buffer is discarded, the snapshot is restored, and the exception is allowed to bubble up.

---

### The Problem We Need to Solve

Implement `Client` and its companion `Transaction` class in `main.py`.

#### Requirements:
1. **`Client.transaction(self)`**: Returns an instance of `Transaction(self)`.
2. **`Transaction.__enter__(self)`**:
   - Takes a deep copy snapshot of `self._client._data`.
   - Initializes an empty operations buffer (`self._ops`).
   - Returns `self`.
3. **`Transaction.put(self, key, entity)` & `Transaction.delete(self, key)`**:
   - Record the operation into `self._ops` without modifying `self._client._data` yet.
4. **`Transaction.__exit__(self, exc_type, exc, tb)`**:
   - If an exception occurred (`exc_type is not None`):
     - Restore `self._client._data = self._snapshot`.
     - Clear `self._ops`.
     - Return `False` (allowing the exception to propagate).
   - If no exception occurred:
     - Apply all buffered operations in order to `self._client._data`.
     - Return `False`.

---

### Your Task

- [ ] Implement `Client.transaction(self)` in `main.py`
- [ ] Implement the context manager protocol (`__enter__` and `__exit__`) on `Transaction`
- [ ] Ensure writes are buffered until successful context exit
- [ ] Ensure any exception inside the `with` block triggers a complete rollback

---

### Example

```py
client = Client()
client.put(("Reply", "draft"), {"body": "Drafting..."})

# Clean commit via context manager
with client.transaction() as tx:
    tx.put(("Thread", "t1"), {"title": "Distributed Transactions"})
    tx.delete(("Reply", "draft"))

assert client.get(("Thread", "t1"))["title"] == "Distributed Transactions"
assert client.get(("Reply", "draft")) is None

# Automatic rollback on failure
try:
    with client.transaction() as tx:
        tx.put(("Thread", "t1"), {"title": "Corrupted"})
        raise RuntimeError("Network failure!")
except RuntimeError:
    print("Caught error!")

# Title remains uncorrupted
assert client.get(("Thread", "t1"))["title"] == "Distributed Transactions"
```
