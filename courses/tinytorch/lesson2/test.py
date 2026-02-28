import numpy as np
from main import Tensor

def test_addition():
    # Test tensor + tensor
    a = Tensor([1, 2, 3])
    b = Tensor([4, 5, 6])
    result = a + b
    # TODO: Check if result.data equals [5, 7, 9]
    assert np.array_equal(result.data, np.array([5,7,9]))
    
    # Test tensor + scalar
    result = a + 10
    # TODO: Add your test here
    assert np.array_equal(result.data, np.array([11, 12, 13]))
    
    print("✅ Addition tests passed!")

def test_subtraction():
    a = Tensor([5, 7, 9])
    b = Tensor([1, 2, 3])
    result = a - b
    assert np.array_equal(result.data, np.array([4, 5, 6]))
    print("✅ Subtraction tests passed!")

def test_multiplication():
    a = Tensor([1, 2, 3])
    b = Tensor([4, 5, 6])
    result = a * b
    assert np.array_equal(result.data, np.array([4, 10, 18]))
    print("✅ Multiplication tests passed!")