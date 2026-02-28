import numpy as np
from main import Tensor


def test_matmul():
    a = Tensor([[1, 2], [3, 4]])
    b = Tensor([[5, 6], [7, 8]])
    result = a.matmul(b)
    expected = np.array([[19, 22], [43, 50]])
    assert np.array_equal(result.data, expected)

def test_matmul_shape_mismatch():
    # a is 2x2, b is 2x3 -> valid multiplication; we need an invalid inner dim
    a = Tensor([[1, 2], [3, 4]])
    b = Tensor([[5, 6], [7, 8], [9, 10]])  # 3x2, inner dims 2 vs 3
    try:
        result = a.matmul(b)
        assert False, "Expected ValueError for shape mismatch"
    except ValueError as e:
        # solution message contains "shape mismatch" and dimensions
        assert "shape mismatch" in str(e).lower()

def test_matmul_scalar_error():
    a = Tensor([[1, 2], [3, 4]])
    b = 5  # Not a Tensor
    try:
        result = a.matmul(b)
        assert False, "Expected TypeError for non-Tensor input"
    except TypeError as e:
        assert "requires Tensor" in str(e)

def test_matmul_1d_error():
    a = Tensor([1, 2, 3])  # 1D tensor
    b = Tensor([[4], [5], [6]])  # 2D tensor
    try:
        result = a.matmul(b)
        assert False, "Expected ValueError for 1D tensor input"
    except ValueError as e:
        assert "requires at least 2D tensors" in str(e)

