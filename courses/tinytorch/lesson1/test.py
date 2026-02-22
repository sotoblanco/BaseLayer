import numpy as np

# Test addition
a = Tensor([1, 2, 3])
b = Tensor([4, 5, 6])
result = a + b
assert result is not None, "Add should return a Tensor"
assert np.allclose(result.data, [5, 7, 9]), f"Expected [5,7,9] but got {result.data}"

# Test multiplication
result2 = a * b
assert result2 is not None, "Mul should return a Tensor"
assert np.allclose(result2.data, [4, 10, 18]), f"Expected [4,10,18] but got {result2.data}"

print("All tests passed!")
