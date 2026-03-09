import numpy as np

class Tensor:
    def __init__(self, data):
        """Create a new tensor from data.        
        """
        self.data = np.array(data, dtype=np.float32)
        self.shape = self.data.shape
        self.size = self.data.size
        self.dtype = self.data.dtype
        
    def __getitem__(self, key):
        ### BEGIN SOLUTION
        result_data = self.data[key]
        if not isinstance(result_data, np.ndarray):
            # If the result is a scalar (0D), wrap it in a 0D Tensor
            result_data = np.array(result_data)
        return Tensor(result_data)
        ### END SOLUTION
   