# Lesson 6: Distributed Atomicity (transact_write_items)

### The Story: The Disappearing Forum Post Incident

A student spent two hours drafting an elaborate answer explaining backpropagation on the BaseLayer forum.

When they clicked **Publish Answer**, our backend executed two operations:
```python
# Step 1: Remove the draft
table.delete({"pk": "THREAD#t1", "sk": "REPLY#draft"})

# Step 2: Insert the published answer (Server crash / network cut!)
table.put({"pk": "THREAD#t1", "sk": "REPLY#r42", "body": "..."})
```

Right after Step 1 executed, a worker pod crashed. Step 2 never ran.

The result? The student's draft was permanently deleted, but the published reply was never inserted! The user was left with an empty screen and two hours of lost work.

In distributed systems, executing multiple dependent operations without **transactional atomicity** guarantees eventual data corruption.

---

### The Data Modeling Concept: Multi-Item ACID in NoSQL

Historically, NoSQL engines only provided single-item atomicity. If you needed to update multiple items across different partitions, you had to write complex two-phase commit logic.

Modern NoSQL engines solve this with multi-item transactions:
* **AWS DynamoDB:** `transact_write_items`
* **GCP Datastore:** `client.transaction()`

**The Invariant of Atomicity (The "A" in ACID):**  
A set of operations must be executed as an indivisible unit:
$$\text{All-or-Nothing}$$

If any operation in the batch fails, the database automatically **rolls back** all prior modifications in the batch. No partial state is ever exposed to callers.

---

### The Problem We Need to Solve

Implement `transact_write(self, actions)` on `DynamoTable`.

#### Transaction Protocol:
1. **Snapshot State:** Before applying any action, create a deep copy of the entire table state (`snapshot = copy.deepcopy(self._data)`).
2. **Execute Actions in Order:**
   - Each action in `actions` is a single-key dictionary:
     - `{"put": item}`: Call `self.put(action["put"])`.
     - `{"delete": key}`: Call `self.delete(action["delete"])`.
   - If an action dictionary has an unrecognized key (not `"put"` and not `"delete"`), raise `ValueError("unknown action")`.
3. **Rollback on Error:**
   - Wrap execution in a `try...except` block.
   - If **any** exception is raised during the transaction (whether a `ValueError`, `KeyError`, etc.), immediately restore `self._data = snapshot` and re-raise the exception.

---

### Your Task

- [ ] Implement `DynamoTable.transact_write(self, actions)` in `main.py`
- [ ] Support `{"put": item}` and `{"delete": key}` actions
- [ ] Raise `ValueError("unknown action")` for invalid action dictionaries
- [ ] Guarantee 100% rollback to the initial state if any error occurs

---

### Example

```py
forum = DynamoTable("Forum", "pk", "sk")
forum.put({"pk": "THREAD#t1", "sk": "REPLY#draft", "body": "Draft notes..."})

# Successful atomic transaction: publish reply AND delete draft
forum.transact_write(
    [
        {"put": {"pk": "THREAD#t1", "sk": "REPLY#r1", "body": "Published answer!"}},
        {"delete": {"pk": "THREAD#t1", "sk": "REPLY#draft"}},
    ]
)

# Attempting a transaction with an invalid action
try:
    forum.transact_write(
        [
            {"put": {"pk": "THREAD#t1", "sk": "REPLY#r2", "body": "Another reply"}},
            {"invalid_command": True},  # Will abort and rollback!
        ]
    )
except ValueError:
    print("Transaction aborted and rolled back cleanly!")

# REPLY#r2 was never committed
assert forum.get({"pk": "THREAD#t1", "sk": "REPLY#r2"}) is None
```
