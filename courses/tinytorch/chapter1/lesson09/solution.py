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
                return Tensor(self.data)
            else:
                # build axes list, swap last two, call np.transpose
                axes = list(range(len(self.shape)))
                axes[-1], axes[-2] = axes[-2], axes[-1]
                return Tensor(np.transpose(self.data, axes))

            ### END SOLUTION
            pass