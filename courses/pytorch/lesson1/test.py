# Test cases for Lesson 1: Hello Tensors

# Run the student's function
result = create_tensor()

# Test 1: Check that function returns something
assert result is not None, "create_tensor() should return a Tensor, not None"

# Test 2: Check that result is a Tensor
assert isinstance(result, Tensor), f"Expected Tensor, got {type(result).__name__}"

# Test 3: Check the data values
expected_data = [[1, 2, 3], [4, 5, 6]]
assert result.data == expected_data, f"Expected data {expected_data}, got {result.data}"

# Test 4: Check the shape
expected_shape = (2, 3)
assert result.shape == expected_shape, f"Expected shape {expected_shape}, got {result.shape}"

print("✅ All tests passed! Great job!")
print(f"Tensor data: {result.data}")
print(f"Tensor shape: {result.shape}")
