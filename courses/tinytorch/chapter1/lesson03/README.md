# Element-wise operations

Implement element-wise addition that works with both Tensors and scalars.

## Assigment

- [ ]  Check if other is a Tensor (use isinstance)
- [ ]  If Tensor: add, substract, multiply or divided self.data and other.data
- [ ]  If scalar: add,  substract, multiply or divide self.data and other (broadcasting)
- [ ]  Wrap result in new Tensor
- Hint
    
> HINT: NumPy's + operator handles broadcasting automatically
    

## Example

```py
>>> a = Tensor([1, 2, 3])
>>> b = Tensor([4, 5, 6])
>>> c = a + b
>>> print(c.data)
[5. 7. 9.]
```