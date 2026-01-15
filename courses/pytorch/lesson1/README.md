# PyTorch Lesson 1: Hello Tensors

Welcome to your first PyTorch lesson! In this exercise, you'll learn the basics of creating tensors.

## Objective

Create a function called `create_tensor` that returns a 2D tensor (matrix) with specific values.

## Instructions

1. Define a function `create_tensor()` that takes no arguments
2. Inside the function, create a 2D list with the values: `[[1, 2, 3], [4, 5, 6]]`
3. Convert this list to a tensor (we'll simulate this with a simple class for now)
4. Return the tensor

## Expected Output

When the tests run, your function should return an object that:
- Has a `data` attribute containing the original list
- Has a `shape` property returning `(2, 3)` (2 rows, 3 columns)

## Example

```python
result = create_tensor()
print(result.data)   # [[1, 2, 3], [4, 5, 6]]
print(result.shape)  # (2, 3)
```

Good luck! 🎯
