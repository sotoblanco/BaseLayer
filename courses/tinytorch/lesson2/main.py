import numpy as np

class Tensor:
    """Educational tensor - the foundation of machine learning computation.

    This class provides the core data structure for all ML operations:
    - data: The actual numerical values (NumPy array)
    - shape: Dimensions of the tensor
    - size: Total number of elements
    - dtype: Data type (float32)

    All arithmetic, matrix, and shape operations are built on this foundation.
    """

    def __init__(self, data):
        """Create a new tensor from data.        
        """
        self.data = np.array(data, dtype=np.float32)
        self.shape = self.data.shape
        self.size = self.data.size
        self.dtype = self.data.dtype

    def __repr__(self):
        """String representation of tensor for debugging."""
        return f"Tensor(data={self.data}, shape={self.shape})"

    def __str__(self):
        """Human-readable string representation."""
        return f"Tensor({self.data})"

    def numpy(self):
        """Return the underlying NumPy array."""
        return self.data

    def memory_footprint(self):
        """Calculate exact memory usage in bytes.

        Systems Concept: Understanding memory footprint is fundamental to ML systems.
        Before running any operation, engineers should know how much memory it requires.

        Returns:
            int: Memory usage in bytes (e.g., 1000x1000 float32 = 4MB)
        """
        return self.data.nbytes

    def __add__(self, other):
        """Add two tensors element-wise with broadcasting support.
        
        TODO: Implement element-wise addition that works with both Tensors and scalars.
        """
        ### BEGIN SOLUTION

        ### END SOLUTION

    def __sub__(self, other):
        """Subtract two tensors element-wise.
        
        TODO: Implement element-wise subtraction.
        """
        ### BEGIN SOLUTION

        ### END SOLUTION

    def __mul__(self, other):
        """Multiply two tensors element-wise (NOT matrix multiplication).
        
        TODO: Implement element-wise multiplication.
        """
        ### BEGIN SOLUTION

        ### END SOLUTION

    def __truediv__(self, other):
        """Divide two tensors element-wise.
        
        TODO: Implement element-wise division.
        """
        ### BEGIN SOLUTION
        
        ### END SOLUTION
