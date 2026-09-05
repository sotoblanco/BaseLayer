# Lesson 1: Query-First Modeling (HASH & RANGE Keys)

### The Story: The Forum Scaling Wall

Success brought a crisis.

BaseLayer launched community discussion forums and a hardware catalog. Thousands of engineers flooded in to discuss deep learning architectures and buy edge acceleration kits.

In our relational database, rendering a single forum thread required:
```sql
SELECT * FROM forums f
JOIN threads t ON t.forum_id = f.id
JOIN replies r ON r.thread_id = t.id
JOIN users u ON r.author_id = u.id
WHERE t.id = 4520
ORDER BY r.created_at ASC;
```

At 50,000 concurrent requests, the database server melted:
```
FATAL: remaining connection slots are reserved for non-replication superuser connections
Query timeout: canceling statement due to statement timeout (5000ms)
```

Relational databases cannot scale joins horizontally without distributed lock overhead. We needed a database architecture designed for massive write throughput and sub-10ms point reads: **Amazon DynamoDB** and **Google Cloud Datastore**.

---

### The Data Modeling Concept: Query-First Modeling & Key Architecture

In relational design, you model **entities first** and figure out queries later using SQL joins.

In NoSQL systems (DynamoDB, Cassandra, Datastore), you must **model queries first**. You design physical data placement around your application's read paths:

1. **Partition Key (HASH):**  
   The HASH key is fed through an internal hashing algorithm (e.g. MD5 or MurmurHash) to assign the item to a physical storage partition (node). All records with the same partition key live on the exact same storage node.
2. **Sort Key (RANGE):**  
   An optional secondary key. Within a physical partition, items are stored physically sorted by this key on disk (in a B-Tree or LSM-Tree).
3. **Composite Primary Key (`(HASH, RANGE)`):**  
   Allows a 1-to-many relationship to live inside a **single partition**:
   - `pk`: `"FORUM#python"`
   - `sk`: `"THREAD#2026-09-01#intro"` or `"REPLY#001"`

By co-locating related items within the same partition, you eliminate cross-network distributed joins entirely.

---

### The Problem We Need to Solve

You will begin building the local twin of DynamoDB: `DynamoTable`.

The table is initialized with:
* `name`: The table identifier (e.g. `"ProductCatalog"` or `"Forum"`).
* `hash_key`: The name of the partition key attribute (e.g. `"category"` or `"pk"`).
* `range_key`: An optional sort key attribute (default `None`).

Your first task is to implement the key extractor `key_of(item)`:
1. Extract `item[self.hash_key]`. If missing, raise `KeyError`.
2. If `self.range_key` is configured, extract `item[self.range_key]`. If missing, raise `KeyError`.
3. Return a tuple:
   - `(hash_value,)` for simple tables.
   - `(hash_value, range_value)` for composite tables.

---

### Your Task

- [ ] Implement `DynamoTable.__init__(self, name, hash_key, range_key=None)` in `main.py`
- [ ] Implement `DynamoTable.key_of(self, item)`
- [ ] Raise `KeyError` if any required key attribute is missing from `item`
- [ ] Return a 1-tuple for HASH-only tables or a 2-tuple for composite tables

---

### Example

```py
# Composite table: Product catalog partitioned by category, sorted by product_id
catalog = DynamoTable("ProductCatalog", "category", "product_id")

item = {
    "category": "workstations",
    "product_id": "ws-99",
    "specs": "8x H100 GPUs",
    "price": 250000,
}

key = catalog.key_of(item)
print(key)
# => ('workstations', 'ws-99')

# Simple table: Forum metadata partitioned by forum name
forums = DynamoTable("Forum", "name")
print(forums.key_of({"name": "announcements"}))
# => ('announcements',)
```
