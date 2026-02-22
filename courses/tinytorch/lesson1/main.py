import numpy as np

class Tensor:
    def __init__(self, data):
        self.data = np.array(data, dtype=float)

    def __add__(self, other):
        # TODO: return a new Tensor with the sum of self.data and other.data
        pass

    def __mul__(self, other):
        # TODO: return a new Tensor with the element-wise product
        pass

    def __repr__(self):
        return f"Tensor({self.data})"
