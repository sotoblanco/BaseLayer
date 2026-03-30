import numpy as np

class Tensor:
    def __init__(self, data):
        """Create a new tensor from data.        
        """
        self.data = np.array(data, dtype=np.float32)
        self.shape = self.data.shape
        self.size = self.data.size
        self.dtype = self.data.dtype
        
        
    def transpose(self, dim0=None, dim1=None):
        ### BEGIN SOLUTION
        if dim0 is None and dim1 is None:
            if len(self.shape) < 2:
                # 1D case - what goes here?
                return Tensor(self.data.copy())
            else:
                # build axes list, swap last two, call np.transpose
                axes = list(range(len(self.shape)))
                axes[-1], axes[-2] = axes[-2], axes[-1]
                return Tensor(np.transpose(self.data, axes))
        else:
            # Error Handling: Check if they forgot one dimension
            if dim0 is None or dim1 is None:
                raise ValueError("Transpose requires both dim0 and dim1, or neither.")
            axes = list(range(len(self.shape)))
            axes[dim0], axes[dim1] = axes[dim1], axes[dim0]
            return Tensor(np.transpose(self.data, axes))

        ### END SOLUTION