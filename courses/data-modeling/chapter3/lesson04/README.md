# Lesson 4: Single-Partition Queries (query + sort)

### The Story: The High-Speed Forum Feed

Now that `scan` has been banned from production, we need to implement the core user experience for the BaseLayer Community Forum:

> *"When a student opens the 'Python & PyTorch' forum, display all discussion threads, ordered chronologically. If they toggle 'Newest First', reverse the list immediately."*

In our old SQL database, this was an expensive `SELECT ... WHERE forum = 'python' ORDER BY timestamp DESC` that forced disk seeks and memory sorting.

In DynamoDB and Datastore, we do not sort at query time. We model the **physical layout of the data** so that items are **already sorted on disk**.

---

### The Data Modeling Concept: Partition Boundaries & Sort Key Indexing

A **`query`** operation in NoSQL is fundamentally different from a SQL query. It has one non-negotiable requirement:
> **You MUST provide the exact Partition Key (HASH).**

Here is what happens under the hood when you execute a `query`:
1. The storage engine hashes your `hash_value` to identify the single storage node hosting that partition.
2. Because all items inside that partition share the same partition key, they are stored contiguously in a local B-Tree indexed by the **Sort Key (RANGE)**.
3. The engine simply opens a disk iterator at the beginning of the partition and reads forward—**zero sorting compute required!**
4. If `scan_index_forward=False`, the iterator simply traverses the B-Tree in reverse (from highest sort key to lowest).

This is why a single-partition query can retrieve 1,000 sorted forum posts in under 5 milliseconds, even when the database holds 100 terabytes of data.

---

### The Problem We Need to Solve

Implement `query(self, hash_value, scan_index_forward=True)` on `DynamoTable`.

#### Requirements:
1. **Locate Partition:** Find the partition corresponding to `hash_value` in `self._data`. If the partition does not exist, return `[]`.
2. **Simple Tables (HASH-only):** If `self.range_key is None`, return a 1-element list `[dict(item)]` if present, or `[]` if absent.
3. **Composite Tables (HASH + RANGE):**
   - Extract all items in `self._data[hash_value]`.
   - Sort the items by their RANGE key:
     - Ascending if `scan_index_forward=True`.
     - Descending if `scan_index_forward=False`.
   - Return a list of defensive copies.

---

### Your Task

- [ ] Implement `DynamoTable.query(self, hash_value, scan_index_forward=True)` in `main.py`
- [ ] Return `[]` for missing partitions
- [ ] Sort items by their RANGE key in ascending order (or descending when `scan_index_forward=False`)
- [ ] Return defensive copies of all matching items

---

### Example

```py
forum = DynamoTable("Forum", "pk", "sk")

# Seed partition FORUM#pytorch
forum.put({"pk": "FORUM#pytorch", "sk": "THREAD#2026-09-01", "title": "Tensors Intro"})
forum.put(
    {"pk": "FORUM#pytorch", "sk": "THREAD#2026-09-02", "title": "Backprop Deep Dive"}
)

# Chronological feed (Ascending)
feed_asc = forum.query("FORUM#pytorch", scan_index_forward=True)
print([item["title"] for item in feed_asc])
# => ['Tensors Intro', 'Backprop Deep Dive']

# Reverse-chronological feed (Newest first)
feed_desc = forum.query("FORUM#pytorch", scan_index_forward=False)
print([item["title"] for item in feed_desc])
# => ['Backprop Deep Dive', 'Tensors Intro']
```
