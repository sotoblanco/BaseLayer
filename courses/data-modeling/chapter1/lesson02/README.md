# Lesson 2: Schema as a Contract (Schema-on-Write)

### The Story: The 2 AM Auth Service Outage

It's 2:15 AM. PagerDuty sounds the alarm: **User signups are failing with 500 errors.**

A third-party OAuth provider just rolled out an API update. Along with the standard user fields, their webhook started sending extraneous telemetry data:

```json
{
  "id": 1042,
  "username": "ada_lovelace",
  "email": "ada@computing.org",
  "role": "student",
  "client_fingerprint": "x9a8-33b",
  "device_telemetry": {"screen": "retina", "os": "darwin"}
}
```

Because our signup handler was naively inserting the incoming JSON object directly into our relational `User` table, the database rejected the write:
```
OperationalError: Table 'users' has no column named 'client_fingerprint'
```

To make matters worse, some mobile clients were submitting string IDs (`"id": "1042"`) instead of integers, poisoning foreign keys across our entire platform.

---

### The Data Modeling Concept: Schema-on-Write

This outage illustrates a core tenet of data modeling: **the difference between Schema-on-Write and Schema-on-Read.**

* **Schema-on-Read (NoSQL / Data Lakes):** You write raw blobs or documents without checking their structure upfront. When you query the data later, your application code must handle missing fields, unexpected types, and corrupted keys.
* **Schema-on-Write (Relational Systems):** The storage engine enforces a rigid **contract** at insertion time. Every row must match the declared types, required columns must be present, and arbitrary undeclared columns must be dropped or rejected.

Schema-on-write prevents **data rot**. It guarantees that any service querying the `User` table can rely 100% on the presence and types of its columns.

---

### The Problem We Need to Solve

You must implement a strict schema validator `validate(row, schema)` at the gate of our relational storage layer. 

Given an incoming dictionary `row` and a schema dictionary mapping field names to Python types (e.g. `{"id": int, "username": str}`):
1. **Contract Enforcement:** Verify that every field defined in `schema` exists in `row`. If any required field is missing, raise a `KeyError(missing_field)`.
2. **Type Safety:** Verify that the value in `row[field]` matches the exact type defined in `schema[field]`. If there is a mismatch (e.g., `"1"` instead of `1`), raise a `TypeError(field)`.
3. **Projection:** Return a clean dictionary containing **only** the validated schema fields. Any extraneous keys (like `client_fingerprint`) must be stripped out.

---

### Your Task

- [ ] Implement `validate(row, schema)` in `main.py`
- [ ] Raise `KeyError` if any field from `schema` is absent in `row`
- [ ] Raise `TypeError` if any field's value fails `isinstance(value, expected_type)`
- [ ] Return a new dictionary containing only the declared schema fields

---

### Example

```py
user_schema = {"id": int, "username": str, "email": str, "role": str}

payload = {
    "id": 1,
    "username": "soto",
    "email": "soto@example.com",
    "role": "student",
    "tracking_cookie": "abc-xyz-123",  # Extra undeclared field
}

clean_row = validate(payload, user_schema)
print(clean_row)
# => {'id': 1, 'username': 'soto', 'email': 'soto@example.com', 'role': 'student'}
```
