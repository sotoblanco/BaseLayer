# Lesson 2: Ingestion & Upserts (put & batch_write)

### The Story: Bulk Ingestion of the Hardware Catalog

BaseLayer just partnered with AI hardware vendors to offer workstation kits and development boards to our students.

Every morning at 4:00 AM, vendor feeds push updates for thousands of products: price changes, stock availability, and new GPU bundles.

In a relational database, processing thousands of item updates created a bottleneck:
* Each individual insert had to acquire row-level locks and write to write-ahead logs (WAL).
* If a product already existed, the query had to execute expensive conflict resolution (`ON CONFLICT (id) DO UPDATE`).

In NoSQL systems like **DynamoDB** and **Google Cloud Datastore**, writes are fundamentally different:
1. Every write is naturally an **upsert** (Insert or Overwrite).
2. Bulk writes are batched into parallel network requests (`batch_write_item` in AWS, `put_multi` in GCP).

---

### The Data Modeling Concept: Upsert Semantics & Physical Storage

Unlike SQL's `INSERT` (which rejects duplicates to preserve entity integrity), NoSQL storage engines use **Upsert Semantics**:
* If an item with the given key does not exist, it is created.
* If an item with the given key already exists, its attributes are completely replaced with the new payload.

This design makes ingestion pipelines **idempotent**: if a network blip occurs midway through a bulk load, the worker can simply re-run the batch without worrying about "duplicate key" exceptions.

Internally, our composite NoSQL storage structure mirrors the physical storage architecture of distributed LSM/B-Trees:
* For simple tables: `self._data[hash_value] = item`
* For composite tables: `self._data[hash_value][range_value] = item`

---

### The Problem We Need to Solve

Implement `put(item)` and `batch_write(items)` on `DynamoTable`.

#### Requirements:
1. **`put(self, item)`**:
   - Save a defensive copy (`dict(item)`) into `self._data`.
   - If `self.range_key is None`: Store directly under `self._data[hash_value]`.
   - If `self.range_key` exists: Ensure the sub-dictionary `self._data[hash_value]` exists, then store under `self._data[hash_value][range_value]`.
   - Overwrite any previous item with the same key.
2. **`batch_write(self, items)`**:
   - Iterate through the list of items and call `self.put(item)` for each.

---

### Your Task

- [ ] Implement `DynamoTable.put(self, item)` in `main.py`
- [ ] Ensure defensive copies are stored so external mutation cannot affect internal data
- [ ] Handle both HASH-only and HASH+RANGE composite tables
- [ ] Implement `DynamoTable.batch_write(self, items)`

---

### Example

```py
catalog = DynamoTable("ProductCatalog", "category", "product_id")

# Single upsert
catalog.put(
    {
        "category": "accelerators",
        "product_id": "acc-1",
        "name": "PCIe TPU v4",
        "price": 1200,
    }
)

# Batch write
catalog.batch_write(
    [
        {
            "category": "accelerators",
            "product_id": "acc-2",
            "name": "Edge TPU",
            "price": 150,
        },
        {
            "category": "laptops",
            "product_id": "lap-1",
            "name": "DevBook Pro",
            "price": 2400,
        },
    ]
)
```
