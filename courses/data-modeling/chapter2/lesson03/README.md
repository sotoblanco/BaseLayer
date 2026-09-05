# Lesson 3: Reconstructing Relations (Inner Join)

### The Story: The Course Curriculum Screen

Normalization was a triumph: our data is clean, duplication is eliminated, and foreign key constraints prevent orphan records.

Now the product team hands you a new ticket: **Build the Student Curriculum View.**

When a student clicks on a course, the frontend needs to render:
* The Course Title (`courses.slug`),
* The Lesson Title (`exercises.title`), and
* The Lesson ID (`exercises.id`).

Because our relational model separated `courses` and `exercises` into two distinct tables, neither table alone has all the required data! We need a way to combine rows across tables at query time without physically copying or denormalizing the underlying storage.

---

### The Data Modeling Concept: Relational Joins & Projection

In relational data modeling, data is normalized to optimize writes and eliminate anomaly updates. But reads often require viewing related entities together. We bridge this gap using **Relational Joins**:

$$\text{Result} = \sigma_{\text{left}[left\_key] == \text{right}[right\_key]}(\text{left} \times \text{right})$$

An **Inner Join** combines rows from two tables whenever their join condition is met:
1. **Predicate Matching:** For each row in the `left` table, find every row in the `right` table where `left[left_key] == right[right_key]`.
2. **Column Namespacing:** Since both tables often share common column names (such as `id`), columns in the joined result are namespaced with their table origin: `"{table_name}.{column_name}"` (e.g., `exercises.id` vs `courses.id`).
3. **Filtering:** Any row in either table that has no corresponding match in the other table is excluded from the result.

---

### The Problem We Need to Solve

Implement the function `inner_join(left, right, left_key, right_key)` in `main.py`.

#### Algorithm:
1. Retrieve all rows from the `left` table and all rows from the `right` table using `table.all()`.
2. For each row in `left` and each row in `right`:
   - Check if `left_row[left_key] == right_row[right_key]`.
   - If they match, construct a merged dictionary:
     - For every `(field, value)` in `left_row`, add `f"{left.name}.{field}": value`.
     - For every `(field, value)` in `right_row`, add `f"{right.name}.{field}": value`.
   - Append the merged dictionary to the results list.
3. Return the list of joined records.

---

### Your Task

- [ ] Implement `inner_join(left, right, left_key, right_key)` in `main.py`
- [ ] Match rows where `left_row[left_key] == right_row[right_key]`
- [ ] Prefix all output dictionary keys with their table name (`"{table.name}.{field}"`)
- [ ] Ensure non-matching rows are omitted from the output

---

### Example

```py
courses = Table("courses", "id")
exercises = Table("exercises", "id")

courses.insert({"id": 10, "slug": "data-modeling"})
exercises.insert({"id": 101, "course_id": 10, "title": "Data Shapes"})
exercises.insert({"id": 102, "course_id": 99, "title": "Unlinked"})  # No match

joined = inner_join(exercises, courses, "course_id", "id")
print(joined)
# Output:
# [
#   {
#     'exercises.id': 101,
#     'exercises.course_id': 10,
#     'exercises.title': 'Data Shapes',
#     'courses.id': 10,
#     'courses.slug': 'data-modeling'
#   }
# ]
```
