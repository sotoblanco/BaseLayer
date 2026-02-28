import numpy as np

class Tensor:
    def __init__(self, data):
        """Create a new tensor from data.        
        """
        self.data = np.array(data, dtype=np.float32)
        self.shape = self.data.shape
        self.size = self.data.size
        self.dtype = self.data.dtype

    def matmul(self, other):
        """Perform matrix multiplication between self and other."""
        ### BEGIN SOLUTION

        ### END SOLUTION
        pass

    def __matmul__(self, other):
            """Enable @ operator for matrix multiplication."""
            return self.matmul(other)
