from main import Tensor
import numpy as np

def test_row():
    t = Tensor([[1, 2, 3], [4, 5, 6]])
    row = t[0]
    assert np.array_equal(row.data, np.array([1, 2, 3]))
    print("Row accessing succesfully!")

def test_item():
    t = Tensor([[1, 2, 3], [4, 5, 6]])
    item = t[0, 0]
    assert np.array_equal(item.data, np.array(1))
    print("Single element succesfull!")

    