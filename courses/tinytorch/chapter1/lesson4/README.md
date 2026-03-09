## Matrix multiplication of two tensors

TODO: Implement matrix multiplication with shape validation.

This helper checks three conditions before any computation begins:
1. The other operand must be a Tensor (not a plain number or array)
2. Neither operand can be a 0D scalar (scalars use * instead)
3. For 2D+ tensors, the inner dimensions must align


TODO: Implement the three validation checks for matrix multiplication.

APPROACH:
1. Check isinstance(other, Tensor) - raise TypeError if not
2. Check both tensors are at least 1D - raise ValueError if 0D
3. For 2D+ tensors, check self.shape[-1] == other.shape[-2]

EXAMPLE:
```py
>>> a = Tensor([[1, 2], [3, 4]])  # 2x2
>>> b = Tensor([[5, 6], [7, 8]])  # 2x2
>>> a._validate_matmul_shapes(b)  # No error - shapes are compatible
>>> c = Tensor([[1, 2, 3]])        # 1x3
>>> d = Tensor([[1], [2]])         # 2x1
>>> c._validate_matmul_shapes(d)   # ValueError - 3 != 2
```

> HINT: 
    - Use len(tensor.shape) to check dimensionality and tensor.shape[-1]
to access the last dimension.
