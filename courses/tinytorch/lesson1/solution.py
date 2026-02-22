import numpy as np

class Tensor:
    def __init__(self, data):
        self.data = np.array(data, dtype=float)

    def __add__(self, other):
        return Tensor(self.data + other.data)

    def __mul__(self, other):
        return Tensor(self.data * other.data)

    def __repr__(self):
        return f"Tensor({self.data})"
