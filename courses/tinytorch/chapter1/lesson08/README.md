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

## Exercise: Implement `reshape` from Scratch

### Why does `reshape` exist?
In neural networks, data constantly changes shape. For example, an image batch `(32, 28, 28)` needs to become `(32, 784)` before entering a fully connected layer. Reshape lets us **reinterpret** the same data in a new shape.

---

### Part 1: Handling two calling styles
Users might call reshape two ways:
```python
t.reshape(2, 3)    # integers → shape = (2, 3)
t.reshape((2, 3))  # tuple   → shape = ((2, 3),) ← needs unwrapping!
```
**Why**: Convenience — both styles are common in ML code.

**Your task**: Normalise both into `new_shape = (2, 3)`.

---

### Part 2: The `-1` wildcard
```python
t.reshape(2, -1)   # "I know one dim is 2, figure out the rest"
```
**Why**: Very common when flattening — you know the batch size but not the feature count.

**Your task**: Find `-1`, multiply all *other* dims, divide `self.size` by that.

---

### Part 3: Validation
```python
t.reshape(2, 2)  # 6 elements can't fit in 2×2=4 → error!
```
**Why**: Catch mistakes early with a clear error message.

**Your task**: Check `np.prod(new_shape) == self.size`.

---

### Part 4: Do the reshape
**Why**: Finally use NumPy to actually rearrange the data.

**Your task**: Use `np.reshape` and return a new `Tensor`.

---

Try implementing each part one at a time. Start with Part 1 — what do you have?


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