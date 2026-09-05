# Lesson 3: Access Paths (get vs. scan)

### The Story: The $12,000 Cloud Bill

On Monday morning, the CTO called an emergency meeting. Over the weekend, BaseLayer's AWS bill spiked by **$12,400**. 

What caused it? A seemingly innocent search feature built for the hardware catalog:

```python
# The catastrophic query:
def search_product(name):
    # Reads every single item in the entire database!
    all_items = catalog_table.scan()
    for item in all_items:
        if item["name"] == name:
            return item
    return None
```

In the staging environment with 20 items, this endpoint responded in 2 milliseconds. But in production with 500,000 products and 2,000 concurrent students searching for course materials, every search triggered an exhaustive scan across hundreds of physical database partitions.

The table saturated its provisioned Read Capacity Units (RCUs), throttled legitimate checkouts, and burned thousands of dollars in cloud compute.

---

### The Data Modeling Concept: Point Reads vs. Full Table Scans

In NoSQL data modeling, you must understand the mechanical cost of your access paths:

| Operation | AWS SDK | GCP Datastore | Algorithmic Complexity | Physical Execution | Production Use Case |
|---|---|---|---|---|---|
| **Point Read (`get`)** | `get_item` | `client.get(key)` | $O(1)$ | Direct hash lookup to the exact storage node + B-tree seek. Consumes minimal capacity (0.5 RCU). | High-frequency API endpoints, user sessions, product detail pages. |
| **Table Scan (`scan`)** | `scan` | `client.query().fetch()` | $O(N)$ | Walks every single partition across the entire distributed cluster, reading every byte into memory. | Offline ETL, analytics exports, database migrations only. |

**Rule of Thumb in NoSQL:** If your production OLTP API requires a `scan`, **your data model is broken.**

---

### The Problem We Need to Solve

Implement both `get(key)` and `scan()` on `DynamoTable` to experience the difference between targeted key retrieval and exhaustive traversal.

#### Requirements:
1. **`get(self, key)`**:
   - Accepts a key dictionary (e.g., `{"category": "laptops", "product_id": "p1"}`).
   - Look up the item directly using the partition key (and sort key, if applicable).
   - If found, return a defensive copy (`dict`) of the item.
   - If not found, return `None`.
2. **`scan(self)`**:
   - Collect every stored item across all partitions into a flat list.
   - Return defensive copies of all items.

---

### Your Task

- [ ] Implement `DynamoTable.get(self, key)` in `main.py`
- [ ] Return `None` if the item is missing (do not raise KeyError)
- [ ] Implement `DynamoTable.scan(self)` returning a list of all items across all partitions
- [ ] Ensure all returned records are defensive copies

---

### Example

```py
catalog = DynamoTable("ProductCatalog", "category", "product_id")
catalog.put({"category": "laptops", "product_id": "lap-1", "name": "DevBook"})

# Efficient point read O(1)
item = catalog.get({"category": "laptops", "product_id": "lap-1"})
print(item["name"])  # => "DevBook"

# Missing point read
missing = catalog.get({"category": "phones", "product_id": "ph-9"})
print(missing)  # => None

# Exhaustive scan O(N)
all_items = catalog.scan()
print(f"Total items in catalog: {len(all_items)}")
```
