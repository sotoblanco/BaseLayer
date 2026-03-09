## Matrix multiplication of two tensors

Validates shapes via `_validate_matmul_shapes`, then computes the product.
For 2D matrices, uses explicit nested loops so you can see exactly how
each output element is a dot product of a row and a column. For batched
(3D+) inputs, delegates to `np.matmul`.

TODO: Validate inputs with `_validate_matmul_shapes`, then compute the
matrix product using explicit loops for 2D and np.matmul for 3D+.

APPROACH:
1. Call `self._validate_matmul_shapes(other)` to check compatibility
2. For 2D matrices: use explicit nested loops with `np.dot` per element
3. For batched (3D+): use `np.matmul` for correctness
4. Return result wrapped in `Tensor`

EXAMPLE:
```python
>>> a = Tensor([[1, 2], [3, 4]])  # 2x2
>>> b = Tensor([[5, 6], [7, 8]])  # 2x2
>>> c = a.matmul(b)
>>> print(c.data)
[[19. 22.]
    [43. 50.]]
```

> HINTS:
> - Inner dimensions must match: (M, K) @ (K, N) = (M, N)
> - For 2D case: use np.dot(a[i, :], b[:, j]) for each output element
> - The validation helper already handles all error cases