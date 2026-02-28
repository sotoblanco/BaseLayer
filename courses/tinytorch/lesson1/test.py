import numpy as np
from main import Tensor

def test_scalar():
    scalar = Tensor(5.0)
    assert scalar.shape == ()
    assert scalar.size == 1
    assert scalar.data == 5.0
    assert scalar.dtype == np.float32
    print("Scalar creation successful")

def test_vector():
    vector = Tensor([1, 2, 3])
    assert vector.shape == (3,)
    assert vector.size == 3
    assert (vector.data == np.array([1, 2, 3], dtype=np.float32)).all()
    assert vector.dtype == np.float32
    print("Vector creation successful")

def test_matrix():
    matrix = Tensor([[1, 2], [3, 4]])
    assert matrix.shape == (2, 2)
    assert matrix.size == 4
    assert (matrix.data == np.array([[1, 2], [3, 4]], dtype=np.float32)).all()
    assert matrix.dtype == np.float32
    print("Matrix creation successful")

def test_3d_tensor():
    tensor_3d = Tensor([[[1, 2], [3, 4]], [[5, 6], [7, 8]]])
    assert tensor_3d.shape == (2, 2, 2)
    assert tensor_3d.size == 8
    assert (tensor_3d.data == np.array([[[1, 2], [3, 4]], [[5, 6], [7, 8]]], dtype=np.float32)).all()
    assert tensor_3d.dtype == np.float32
    print("3D tensor creation successful")

def test_empty_tensor():
    empty_tensor = Tensor([])
    assert empty_tensor.shape == (0,)
    assert empty_tensor.size == 0
    assert empty_tensor.dtype == np.float32
    print("Empty tensor creation successful")

def test_different_data_types():
    tensor_int = Tensor([1, 2, 3])
    assert tensor_int.dtype == np.float32
    print("Tensor with different data types successful")

def test_different_shapes():
    tensor_shape = Tensor([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    assert tensor_shape.shape == (10,)
    assert tensor_shape.size == 10
    assert (tensor_shape.data == np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], dtype=np.float32)).all()
    assert tensor_shape.dtype == np.float32
    print("Tensor with different shapes successful")

def test_operations():
    t = Tensor([1, 2, 3])
    # Placeholder for operations tests if we had them implemented
    print("Tensor operations test placeholder successful")
