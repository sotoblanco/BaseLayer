## Matrix multiplication of two tensors

TODO: Implement matrix multiplication with shape validation.

 Assignment

- [ ]  Validate other is a Tensor (Raise TypeError if not)
- [ ]  Check for scalar cases (0D tensors) - use element-wise multiply
- [ ]  For 2D+ matrices: validate inner dimensions match (shape[-1] == shape[-2])
- [ ]  For 2D matrices: use explicit nested loops (educational)
- [ ]  For batched (3D+): use np.matmul for correctness
- [ ]  Return result wrapped in Tensor

Example

```python
>>> a = Tensor([[1, 2], [3, 4]])  # 2×2
>>> b = Tensor([[5, 6], [7, 8]])  # 2×2
>>> c = a.matmul(b)
>>> print(c.data)
[[19. 22.]
 [43. 50.]]
```

> HINTS:
    - Inner dimensions must match: (M, K) @ (K, N) = (M, N)
    - For 2D case: use `np.dot(a[i, :], b[:, j])` for each output element
    - Raise ValueError with clear message if shapes incompatible