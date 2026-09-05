# Lesson 4: Data Manipulation (Update, Delete, & Key Immutability)

### The Story: The Rogue Role Escalation Incident

As BaseLayer expanded, students began earning instructor privileges and updating profile settings.

Last week, an admin ran a script to update a user's role:
```python
# The catastrophic bug:
table.update(user_id=1, id=2, role="instructor")
```

The script accidentally changed the user's primary key `id` from `1` to `2`! 

The fallout was immediate and severe:
* Every exercise progress record, every comment, and every submission previously linked to `user_id: 1` became orphaned instantly.
* The relational graph was broken because an entity's physical identity had been mutated out from under its foreign key pointers.

In database theory, this is the cardinal sin of relational operations: **Primary keys must be immutable.**

---

### The Data Modeling Concept: DML & The Invariant of Identity

In SQL systems, **Data Manipulation Language (DML)** governs changes to live tuples: `UPDATE` and `DELETE`.

When modeling state transitions in relational storage, two fundamental invariants must hold:

1. **Immutability of Primary Keys:** The primary key is the immutable identity of the record. You can change attributes (e.g., `role`, `email`, `display_name`), but you must never allow an in-place mutation of the primary key column. If identity must change, it requires creating a new record and migrating foreign keys.
2. **Existence Invariant:** An `UPDATE` or `DELETE` targeting a non-existent key must signal failure (raising an exception) rather than silently failing or corrupting state.
3. **Non-Destructive Merging:** An `UPDATE` mutates only the specified columns, leaving all other existing attributes intact.

---

### The Problem We Need to Solve

Enhance the `Table` class with robust, safe implementations of `update(key, **fields)` and `delete(key)`.

#### Requirements:
1. **`update(self, key, **fields)`**:
   - Check if `key` exists in `self._rows`. If not, raise `KeyError`.
   - Protect the primary key: if `self.primary_key` is passed in `fields` and its value differs from `key`, raise `ValueError("cannot change primary key")`.
   - Update the existing row dictionary in-place with `fields`.
   - Return a defensive copy (`dict`) of the updated row.
2. **`delete(self, key)`**:
   - Check if `key` exists in `self._rows`. If not, raise `KeyError`.
   - Delete the row from `self._rows`.

---

### Your Task

- [ ] Implement `Table.update(self, key, **fields)` in `main.py`
- [ ] Raise `KeyError` if the row to update does not exist
- [ ] Raise `ValueError` if `fields` attempts to alter `self.primary_key`
- [ ] Implement `Table.delete(self, key)` and raise `KeyError` if key does not exist

---

### Example

```py
users = Table("users", "id")
users.insert({"id": 1, "username": "soto", "role": "student"})

# Safe attribute update
updated_user = users.update(1, role="instructor")
print(updated_user)
# => {'id': 1, 'username': 'soto', 'role': 'instructor'}

# Attempting to change primary key is blocked!
try:
    users.update(1, id=999)
except ValueError as e:
    print("Primary key modification blocked!")

# Deleting an account
users.delete(1)

# Verifying deletion
try:
    users.get(1)
except KeyError:
    print("User 1 successfully purged.")
```
