# Reshape tensor to new dimensions

## Views vs. Copies
When you reshape a tensor, does it allocate new memory or just create a different view of the same data? The answer has huge implications for both performance and correctness.

A view shares memory with its source. Reshaping a 1 GB tensor is instant because you’re just changing the metadata that describes how to interpret the bytes, not copying the bytes themselves. But this creates an important gotcha: modifying a view modifies the original.

Shape manipulation operations change how data is interpreted without changing the values themselves. Understanding when data is copied versus viewed is crucial for both correctness and performance.

```python
x = Tensor([1, 2, 3, 4])
y = x.reshape(2, 2)  # y is a VIEW of x
y.data[0, 0] = 99    # This also changes x!
```

## Build the reshape method

- Reshape allows to change the shape of a tensor without changing its data. 
- Total number of elements must stay the same
- `[1, 2, 3, 4, 5, 6]` : `(shape (6,))` → `reshape(2, 3)` → `[[1,2,3],[4,5,6]]`: `(shape (2,3))`

Reshape can be called two ways: `reshape(2, 3)` or `reshape((2, 3))`. We need to handle both styles.

So, it uses `*shape` to accept variable arguments, and if the first argument is a tuple, we unpack it. This allows for flexible calling styles while keeping the implementation straightforward.


## TODO: Reshape tensor while preserving total element count.

APPROACH:

- [ ]  Handle both `reshape(2, 3)` and `reshape((2, 3))` calling styles
- [ ]  If -1 in shape, infer that dimension from total size
- [ ]  Validate total elements match: `np.prod(new_shape) == self.size`
- [ ]  Use `np.reshape` to create a new view
- [ ]  Return result wrapped in a new Tensor

Example

```python
>>> t = Tensor([1, 2, 3, 4, 5, 6])
>>> reshaped = t.reshape(2, 3)
>>> print(reshaped.data)
[[1. 2. 3.]
 [4. 5. 6.]]
>>> auto = t.reshape(2, -1)  # Infers -1 as 3
>>> print(auto.shape)
(2, 3)
```

> HINTS:
    - Use `instance(shape[0], (tuple, list))` detect tuple input
    - For -1: `unknown_dim = self.size // known_size`
    - Raise ValueError if total elements don’t match