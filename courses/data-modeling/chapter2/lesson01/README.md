# Lesson 1: Primary Keys & Entity Integrity

### The Story: The Incident of the Overwritten Account

In the earliest proof-of-concept for BaseLayer, the backend stored user records in a plain list:

```python
# The legacy mistake:
user_store = []


def add_user(user):
    user_store.append(user)
```

At first, this worked. But during a launch event, two users created accounts simultaneously. Both were assigned `id = 1`. 

When the user logged in, the lookup searched the list:
```python
def find_user(user_id):
    for u in user_store:
        if u["id"] == user_id:
            return u
```

The second user was returned the first user's private data! To make matters worse, a rogue background worker retrieved a user dictionary and modified `user["username"] = "guest"`, directly mutating the record in shared memory.

The post-mortem revealed two critical failures:
1. We had no mechanism to guarantee **uniqueness** of identity.
2. Callers could mutate stored records by reference because we didn't enforce **defensive copying**.

---

### The Data Modeling Concept: Entity Integrity & Primary Keys

In relational data modeling, a **Table** (relation) is a set of distinct records (tuples). The most fundamental constraint in relational theory is **Entity Integrity**, which is enforced through a **Primary Key (PK)**:

1. **Uniqueness:** Every row must have a distinct primary key value. Duplicate keys are strictly prohibited.
2. **Mandatory Presence:** A row cannot exist without its primary key.
3. **Immutability of Identity:** The primary key serves as the stable anchor for all lookups, indexing, and foreign key relationships.

By enforcing primary key constraints at the storage layer, we guarantee that no two entities can ever collide.

---

### The Problem We Need to Solve

You will build the core `Table` class for BaseLayer's in-memory storage engine.

The `Table` is initialized with a `name` and a `primary_key` field name (e.g. `Table("users", "id")`).

#### Requirements:
1. **`insert(row)`**:
   - Check that `self.primary_key` is present in `row`. If missing, raise `KeyError`.
   - Check if a row with this primary key already exists. If it does, raise `ValueError("duplicate primary key")`.
   - Store a **copy** of `row` (using `dict(row)`) so external callers cannot mutate internal state.
2. **`get(key)`**:
   - Look up the row by its primary key value.
   - If found, return a **copy** of the row dictionary.
   - If not found, raise `KeyError(key)`.

---

### Your Task

- [ ] Implement `Table.__init__(self, name, primary_key)` in `main.py`
- [ ] Implement `Table.insert(self, row)` with key presence, duplicate checks, and defensive copying
- [ ] Implement `Table.get(self, key)` returning a defensive copy or raising `KeyError`

---

### Example

```py
users = Table("users", "id")

# Successful insertion
users.insert({"id": 1, "username": "soto"})

# Point lookup
user = users.get(1)
print(user)
# => {'id': 1, 'username': 'soto'}

# Attempting duplicate insert raises ValueError
try:
    users.insert({"id": 1, "username": "impostor"})
except ValueError as e:
    print("Blocked duplicate key!")
```
