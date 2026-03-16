import numpy as np

class Tensor:
    def __init__(self, data):
        """Create a new tensor from data.        
        """
        self.data = np.array(data, dtype=np.float32)
        self.shape = self.data.shape
        self.size = self.data.size
        self.dtype = self.data.dtype
        
    def reshape(self, *shape):
        ### BEGIN SOLUTION
        if len(shape) == 1 and isinstance(shape[0], (tuple, list)):
            new_shape = tuple(shape[0])
        else:
            new_shape = shape
        if -1 in new_shape:
            if new_shape.count(-1) > 1:
                raise ValueError(
                    f"Cannot reshape {self.shape} with multiple unknown dimensions\n"
                    f" X Found {new_shape.count(-1)} set to -1 in {new_shape}\n"
                    f" Only one dimension can be inferred; others must be specified\n"
                    f" Replace all but one -1 with explicit sizes (total elements: {self.size})")
            know_size = 1
            unknown_idx = new_shape.index(-1)
        ### END SOLUTION
        pass