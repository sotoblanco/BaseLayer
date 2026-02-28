# Lesson 1: Tensors and Operations

### Tensor Creation and Initialization

Before we implement operations, let's understand how tensors store data and manage their attributes. This initialization is the foundation that everything else builds upon.

```
Tensor Initialization Process:
Input Data → Validation → NumPy Array → Tensor Wrapper → Ready for Operations
   [1,2,3] →    types   →  np.array   →    shape=(3,)  →     + - * / @ ...
     ↓             ↓          ↓             ↓
  List/Array    Type Check   Memory      Attributes Set
               (optional)    Allocation

Memory Allocation Example:
Input: [[1, 2, 3], [4, 5, 6]]
         ↓
NumPy allocates: [1][2][3][4][5][6] in contiguous memory
         ↓
Tensor wraps with: shape=(2,3), size=6, dtype=int64

```

**Key Design Principle**: Our Tensor is a wrapper around NumPy arrays that adds ML-specific functionality. We leverage NumPy's battle-tested memory management and computation kernels while adding the gradient tracking and operation chaining needed for deep learning.

**Why This Approach?**

- **Performance**: NumPy's C implementations are highly optimized
- **Compatibility**: Easy integration with scientific Python ecosystem
- **Memory Efficiency**: No unnecessary data copying
- **Future-Proof**: Easy transition to GPU tensors in advanced modules

## Your Task

- [ ] Convert the input ``data`` to a NumPy array with dtype=float32
- [ ] Store the array as ``self.data``
- [ ] Set ``self.shape``, ``self.size``, and ``self.dtype`` from the NumPy array's attributes

## Example
```py
>>> t = Tensor([1, 2, 3])
>>> print(t.shape)
(3,)
>>> print(t.size)
3
```
