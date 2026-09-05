# Lesson 5: NoSQL Mutations (update, delete, & Partition Pruning)

### The Story: The Flash Sale Price Glitch

During BaseLayer's Black Friday Flash Sale, our inventory management service needed to apply discounts to hardware bundles:

```python
# The marketing worker attempt:
catalog.update(
    {"category": "workstations", "product_id": "ws-1"},
    price=799,
    category="clearance",  # Fatal error!
)
```

The script crashed with an unexpected error. Why? Because the engineer attempted to update the item's `category`—which is the **Partition Key** of the table!

In a distributed database like DynamoDB or Datastore, changing a partition key is not a simple pointer update. The partition key determines which physical server in the global cluster stores the record. Changing it requires physically deleting the data from one data center rack, computing a new hash, and transmitting the bytes over the network to another node.

Therefore, NoSQL engines strictly enforce: **Partition and Sort keys cannot be altered in an update.**

---

### The Data Modeling Concept: In-Place Attribute Updates & Partition Lifecycle

1. **Atomic Attribute Updates (`update_item` in AWS):**  
   NoSQL allows in-place mutations of non-key attributes without resending the entire document. You can add new fields, increment counters, or update nested properties.
2. **Strict Key Immutability:**  
   The primary key `(HASH, RANGE)` represents physical addressing. It cannot be mutated. If a key must change, the application must explicitly read the item, write a new item with the desired key, and delete the old one.
3. **Partition Lifecycle & Garbage Collection:**  
   In a composite table (`_data[hash][range]`), deleting the last item in a partition should prune the empty partition dictionary. Leaving empty dictionaries creates "ghost partitions" that consume memory and skew query results.

---

### The Problem We Need to Solve

Implement `update(self, key, **fields)` and `delete(self, key)` on `DynamoTable`.

#### Requirements:
1. **`update(self, key, **fields)`**:
   - Locate the item using `self.get(key)`. If it does not exist, raise `KeyError`.
   - Key Protection: If `self.hash_key` or `self.range_key` appears in `fields`, raise `ValueError("cannot change key")`.
   - Update the existing item's attributes with `fields`.
   - Store the updated item using `self.put(item)`.
   - Return a defensive copy of the updated item.
2. **`delete(self, key)`**:
   - Remove the specified item from storage.
   - For composite tables: If the partition becomes empty after deleting the item, remove the partition entry from `self._data`.
   - Return a defensive copy of the deleted item, or `None` if the item did not exist.

---

### Your Task

- [ ] Implement `DynamoTable.update(self, key, **fields)` in `main.py`
- [ ] Raise `KeyError` if the item is missing
- [ ] Raise `ValueError` if `fields` attempts to modify `self.hash_key` or `self.range_key`
- [ ] Implement `DynamoTable.delete(self, key)` and prune empty partition dictionaries
- [ ] Return the deleted item or `None` if not found

---

### Example

```py
catalog = DynamoTable("ProductCatalog", "category", "product_id")
catalog.put(
    {"category": "laptops", "product_id": "lap-1", "name": "DevBook", "price": 1000}
)

# In-place attribute update
updated = catalog.update({"category": "laptops", "product_id": "lap-1"}, price=899)
print(updated["price"])  # => 899

# Attempting to mutate partition key is rejected
try:
    catalog.update({"category": "laptops", "product_id": "lap-1"}, category="tablets")
except ValueError:
    print("Cannot change partition key in place!")

# Safe deletion
deleted = catalog.delete({"category": "laptops", "product_id": "lap-1"})
print(f"Deleted product: {deleted['name']}")
```
