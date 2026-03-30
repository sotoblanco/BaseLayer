from main import Tensor
import numpy as np



def test_2d_ex1():
    t = Tensor([[1, 2], [3, 4]])
    new_t = t.transpose()
    assert np.array_equal(new_t.data, np.array([[1, 3], [2, 4]]))

    print("Test 1: 2D Matrix Passed")

def test_2d_ex2():
    t = Tensor([[1, 2, 3], [4, 5, 6]])
    new_t = t.transpose()
    assert np.array_equal(new_t.data, np.array([[1, 4], [2, 5], [3, 6]]))
    print("Test 2: 2D Matrix Passed")

def test_3d_ex1():
    t = Tensor([[[1, 2], [3, 4]], [[5, 6], [7, 8]]])
    new_t = t.transpose()
    assert np.array_equal(new_t.data, np.array([[[1, 3], [2, 4]], [[5, 7], [6, 8]]]))
    print("Test 3: 3D Matrix Passed")

def test_3d_ex2():
    t = Tensor([[[1, 2], [3, 4]], [[5, 6], [7, 8]]])
    new_t = t.transpose(0, 2)
    assert np.array_equal(new_t.data, np.array([[[1, 5], [3, 7]], [[2, 6], [4, 8]]]))
    print("Test 4: 3D Matrix Passed")


def test_nodim():
    t = Tensor([1, 2, 3])
    new_t = t.transpose()
    assert np.array_equal(new_t.data, np.array([1, 2, 3]))
    print("Test 5: 1D Matrix Passed")

def test_raise_error():
    t = Tensor([1, 2, 3])
    try:
        t.transpose(0)
    except ValueError as e:
        print("Test 6: Raise Error Passed") 

    