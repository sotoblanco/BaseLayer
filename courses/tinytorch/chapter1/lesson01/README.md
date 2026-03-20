| Property | Type | Description |
|----------|------|-------------|
| `data` | `np.ndarray` | Underlying NumPy array |
| `shape` | `tuple` | Dimensions, e.g., `(2, 3)` |
| `size` | `int` | Total number of elements |
| `dtype` | `np.dtype` | Data type (float32) |

---

## Tensor Intuition with Google Sheets

Before diving into the code, you can build mechanical intuition for how Tensors work using a spreadsheet. In deep learning, Tensors are just organized blocks of data with a specific **Shape**.

### 1. Create your first Tensor
1.  Open a Google Sheet.
2.  Select a range of cells (e.g., `B2:D4` for a 3x3 matrix).
3.  Fill them with numbers.
4.  **Name it:** Select the range, go to **Data > Named ranges**, and name it `T1` (This is an optional step, and you shouldn't do it for the lab, but it is good to know you can).

### 2. Visualize Metadata
Next to your tensor, use these formulas to see how they map to our `Tensor` class properties:
*   **Shape:** `=ROWS(T1) & "x" & COLUMNS(T1)` (Maps to `self.shape`)
*   **Size:** `=COUNT(T1)` (Maps to `self.size`)

### 3. Element-wise Operations
To see how NumPy-style math works (Broadcasting/Element-wise), try this in a new cell:
`=ARRAYFORMULA(T1 * 2)`
This will automatically fill a new range with the doubled values of `T1`, just like `tensor * 2` would in Python.


Task:

- [ ] Click on make a copy and past the link to your spreadsheet
- [ ] Use the correct Google Sheets formulas to get the matrix shape and size
- [ ] Multiply the matrix by 2 and observe the result

If you did everything correct you will get a message saying 