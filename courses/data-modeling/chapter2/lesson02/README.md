# Lesson 2: Foreign Keys & Referential Integrity

### The Story: The Phantom Exercise Outage

During an update to BaseLayer's course catalog, an automated publishing script suffered a timeout:
1. It attempted to create the `courses` row for `id: 42` ("Transformer Architectures"), but the write timed out.
2. The script naively continued and inserted 12 child lessons into the `exercises` table, setting `course_id: 42`.

The result was disastrous:
```
TypeError: Cannot read properties of undefined (reading 'title')
```
When students logged in, the dashboard crashed because 12 **orphaned exercise rows** pointed to a course that did not exist! The database had no mechanism to reject child rows with invalid parent references.

In data modeling, this is called a **Referential Integrity Violation**.

---

### The Data Modeling Concept: Foreign Keys & Normalization

To eliminate data redundancy, relational systems split entities into normalized tables:
* A `Course` table stores course-level metadata once (`id`, `slug`, `title`).
* An `Exercise` table stores individual lessons (`id`, `course_id`, `title`).

The relationship between these tables is governed by a **Foreign Key (FK)**. A foreign key in a child table is a column that references the primary key of a parent table.

**Referential Integrity** guarantees that:
1. A foreign key value must exist as a primary key in the referenced parent table.
2. You cannot insert an orphaned child record.
3. You cannot delete a parent row while child rows still point to it (unless configured with cascading deletes).

---

### The Problem We Need to Solve

We will create a multi-table `Database` manager that coordinates between tables and enforces referential integrity on insert.

#### Architecture:
1. **`Table.__contains__(self, key)`**:
   - Implement `__contains__` on `Table` so we can check membership using Python's `key in table` syntax (checking whether `key in self._rows`).
2. **`Database.add_table(self, table)`**:
   - Registers a `Table` instance under `self.tables[table.name]`.
3. **`Database.insert(self, table_name, row, foreign_keys=None)`**:
   - `foreign_keys` is an optional dictionary mapping a column in `row` to a parent table name:  
     `{"course_id": "courses"}`.
   - For each `(fk_field, parent_table_name)` in `foreign_keys`:
     - Retrieve the parent table from `self.tables`.
     - Check whether `row[fk_field]` exists as a primary key in that parent table (`row[fk_field] in parent_table`).
     - If the parent key does NOT exist, raise `ValueError("foreign key violation")`.
   - If all foreign key constraints pass (or none were provided), insert `row` into the target table.

---

### Your Task

- [ ] Implement `__contains__(self, key)` on `Table` in `main.py`
- [ ] Implement `Database.add_table(self, table)`
- [ ] Implement `Database.insert(self, table_name, row, foreign_keys=None)` to enforce referential integrity

---

### Example

```py
db = Database()
db.add_table(Table("courses", "id"))
db.add_table(Table("exercises", "id"))

# Insert parent course
db.insert("courses", {"id": 10, "slug": "data-modeling"})

# Valid child insertion: course 10 exists
db.insert(
    "exercises",
    {"id": 101, "course_id": 10, "title": "Data Shapes"},
    foreign_keys={"course_id": "courses"},
)

# Invalid child insertion: course 99 does NOT exist
try:
    db.insert(
        "exercises",
        {"id": 102, "course_id": 99, "title": "Orphan"},
        foreign_keys={"course_id": "courses"},
    )
except ValueError as e:
    print("Referential integrity saved the database!")
```
