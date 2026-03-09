import numpy as np
from main import Tensor

def test_tensor_shape():
    a = [1, 2, 3]
    a_ = Tensor(a)
    b = [3, 4, 5]
    try:
        a_._validate_matmul_shapes(b)
        assert False, "Should have raised an error!"
    except TypeError as e:
        print("Correct error raised!")

def scalar_tensor_both():
    a = Tensor(5.0) # This is a 0D scalar len(self.shape) == 0
    b = Tensor(3.0) 
    try:
        a._validate_matmul_shapes(b)
        assert False, "Should have raised a Value Error!"
    except ValueError as e:
        print("Correct ValueError raised!")

def scalar_tensor():
    a = Tensor([[5, 2], [3, 5]]) # shape 2, 2
    b = Tensor(3.0) # 0D scalar
    try:
        a._validate_matmul_shapes(b)
        assert False, "Should have raised a Value Error!"
    except ValueError as e:
        print("Test Passed! Correct ValueError raised")

def test_dimension_missmatch():
    a = Tensor([[2, 1], [4, 5]]) # 2, 2 dimension
    b = Tensor([[1, 2, 3]]) # 1, 3 dimension
    try:
        a._validate_matmul_shapes(b)
        assert False, "Should have raised a Value Error!"
    except ValueError as e:
        print("Test Passed! Correct ValueError raised")

def test_correct_match():
    a = Tensor([[2, 3], [3, 4]])
    b = Tensor([[1, 4], [6, 1]])

    a._validate_matmul_shapes(b)
    print("Test passed!")