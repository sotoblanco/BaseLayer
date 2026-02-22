# Lesson 1: Tensors and Operations

In this lesson you'll implement a basic `Tensor` class that wraps a NumPy array.

## Your Task

Implement the `Tensor` class so it:
- Stores a NumPy array as `.data`
- Supports `+` addition between two tensors
- Supports `*` element-wise multiplication

```python
a = Tensor([1, 2, 3])
b = Tensor([4, 5, 6])
c = a + b   # Tensor([5, 7, 9])
```
