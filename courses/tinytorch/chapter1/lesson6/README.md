## Enabling index slicing operations on Tensors.

TODO: Implement indexing and slicing that returns a new Tensor.

APPROACH:

- [ ]  Use numpy indexing: `self.data[key]`
- [ ]  If result is not an `ndarray`, wrap in `np.array`
- [ ]  Return result wrapped in new tensor

```python
>>> t = Tensor([[1, 2, 3], [4, 5, 6]])
>>> row = t[0]  # First row
>>> print(row.data)
[1. 2. 3.]
>>> element = t[0, 1]  # Single element
>>> print(element.data)
2.0
```

> HINT
    
    Numpy’s indexing handles all complex cases (slicing, fancy indexing)