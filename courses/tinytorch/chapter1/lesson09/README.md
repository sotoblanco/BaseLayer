# Transpose

A transpose is an operation that flips a tensor along it dimensions. For 2D matrix, it turns rows into columns and columns into rows.

```
Original (2 × 3):     Transposed (3 × 2):
[[1, 2, 3],    →→→    [[1, 4],
 [4, 5, 6]]            [2, 5],
                        [3, 6]]
```

**Why is it needed?**

A very common reason is **matrix multiplication shape alignment**. Recall the rule: for `A @ B`, the inner dimensions must match. Sometimes your data is the "wrong way around" and you need to flip it first.

For example:
```
A is (3, 4) and B is (3, 2)
→ A @ B won't work! (4 ≠ 3)
→ A @ B.transpose() works! (4 == 4... wait, is that right?)
```

APPROACH:
- [ ] If no dims specified: swap last two dimensions (most common case)
- [ ] For 1D tensors: return copy (no transpose needed)
- [ ] If both dims specified: swap those specific dimensions
- [ ] Use np.transpose with axes list to perform the swap
- [ ] Return result wrapped in new Tensor

EXAMPLE:

```py
>>> t = Tensor([[1, 2, 3], [4, 5, 6]])  # 2×3
>>> transposed = t.transpose()
>>> print(transposed.data)
[[1. 4.]
 [2. 5.]
 [3. 6.]]  # 3×2
```

> HINTS:
    - Create axes list: [0, 1, 2, ...] then swap positions
    - For default: axes[-2], axes[-1] = axes[-1], axes[-2]
    - Use np.transpose(self.data, axes)