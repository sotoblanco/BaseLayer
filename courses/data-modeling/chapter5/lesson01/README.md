# Lesson 1: Object Stores & Versioned Blobs (S3 & GCS)

### The Story: The Accidentally Overwritten Lessons

One week before the new semester launched, an automated cleanup script suffered a path configuration bug:

```python
# The catastrophic script:
for path in lesson_paths:
    with open(path, "wb") as f:
        f.write(b"")  # Wiped out 50 reference solutions!
```

Because our servers were storing exercise code directly on a standard POSIX filesystem, the byte overwrites were destructive and immediate. There was no undo button, no history, and no recovery without rolling back entire server disk snapshots.

To prevent this from ever happening again, BaseLayer migrated all exercise code, test suites, and diagram assets to **Cloud Object Storage (Amazon S3 and Google Cloud Storage)** with **Object Versioning enabled**.

---

### The Data Modeling Concept: Flat Keyspaces & Immutable Versions

Object storage represents a completely different data modeling paradigm from relational tables or hierarchical filesystems:

1. **Flat Keyspace (No Directories):**  
   In S3/GCS, there are no actual folders or directories. A key like `"courses/tinytorch/lesson01/main.py"` is simply a single flat string. The forward slashes are arbitrary characters used for organizational conventions.
2. **Immutability & Versioning:**  
   Objects are immutable byte sequences. When you "overwrite" a file in a versioned bucket, the storage engine does **not** overwrite the underlying storage. Instead, it appends a new version to the object's history and points the "latest" pointer to it.
   - You can always retrieve any previous revision by its version number.
   - Accidental deletions or corruptions can be reversed instantly.
3. **Prefix Listing:**  
   Instead of `cd` and `ls` tree traversal, object stores provide **Prefix Search**: find all keys starting with `"courses/tinytorch/"`.

---

### The Problem We Need to Solve

Implement the local twin of a versioned cloud bucket: `ObjectStore`.

#### Requirements:
1. **`put(self, key, body)`**:
   - Accepts a `key` (string) and `body` (convertible to `bytes`).
   - Appends the bytes to the version list for `key`.
   - Returns the new version number as a 1-based integer (e.g. `1` for the first upload, `2` for the second).
2. **`get(self, key, version=None)`**:
   - If `key` does not exist in the store, raise `KeyError(key)`.
   - If `version is None`: Return the latest version's bytes.
   - If `version` is specified: Return the bytes for that specific 1-based version. If the version is out of range, raise `KeyError(version)`.
3. **`list_keys(self, prefix="")`**:
   - Return a lexicographically sorted list of all unique keys that start with `prefix`.

---

### Your Task

- [ ] Implement `ObjectStore.__init__(self)` in `main.py`
- [ ] Implement `ObjectStore.put(self, key, body)` with 1-based version incrementing
- [ ] Implement `ObjectStore.get(self, key, version=None)` for latest and historic revisions
- [ ] Implement `ObjectStore.list_keys(self, prefix="")` with sorted output

---

### Example

```py
store = ObjectStore()

# First upload
v1 = store.put("tinytorch/lesson1/main.py", b"def tensor(): pass")
print(f"Uploaded version {v1}")  # => 1

# Revision upload
v2 = store.put("tinytorch/lesson1/main.py", b"def tensor(): return [1, 2, 3]")
print(f"Uploaded version {v2}")  # => 2

# Fetching latest
latest = store.get("tinytorch/lesson1/main.py")
print(latest)  # => b"def tensor(): return [1, 2, 3]"

# Time-travel to version 1
original = store.get("tinytorch/lesson1/main.py", version=1)
print(original)  # => b"def tensor(): pass"

# Prefix search (simulating directory listing)
keys = store.list_keys(prefix="tinytorch/")
print(keys)  # => ['tinytorch/lesson1/main.py']
```
