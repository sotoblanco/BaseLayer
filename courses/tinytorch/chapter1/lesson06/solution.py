import numpy as np

class Tensor:

    def __init__(self, data):
        """Create a new tensor from data.        
        """
        ### BEGIN SOLUTION
        self.data = np.array(data, dtype=np.float32)
        self.shape = self.data.shape
        self.size = self.data.size
        self.dtype = self.data.dtype

    def _validate_matmul_shapes(self, other):
        if not isinstance(other, Tensor):
            raise TypeError(
                f"Matrix multiplication requires Tensor, got {type(other).__name__}\n"
                f"  ❌ Cannot perform: Tensor @ {type(other).__name__}\n"
                f"  💡 Matrix multiplication (@) only works between two Tensors\n"
                f"  🔧 Wrap your data: Tensor({other}) @ other_tensor"
            )
        if len(self.shape) == 0 or len(other.shape) == 0:
            raise ValueError(
                f"Matrix multiplication requires at least 1D tensors\n"
                f"  ❌ Got shapes: {self.shape} @ {other.shape}\n"
                f"  💡 Scalars (0D tensors) cannot be matrix-multiplied; use * for element-wise\n"
                f"  🔧 Reshape scalar to 1D: tensor.reshape(1) or use tensor * scalar"
            )
        if len(self.shape) >= 2 and len(other.shape) >= 2:
            if self.shape[-1] != other.shape[-2]:
                raise ValueError(
                    f"Matrix multiplication shape mismatch: {self.shape} @ {other.shape}\n"
                    f"  ❌ Inner dimensions don't match: {self.shape[-1]} vs {other.shape[-2]}\n"
                    f"  💡 For A @ B, A's last dim must equal B's second-to-last dim\n"
                    f"  🔧 Try: other.transpose() to get shape {other.shape[::-1]}, or reshape self"
                )

    def matmul(self, other):

        ### BEGIN SOLUTION
        self._validate_matmul_shapes(other)
        a = self.data
        b = other.data
        
        if len(self.shape) == 2 and len(other.shape) == 2:
            M, K = a.shape
            K2, N = b.shape
            result_data = np.zeros((M, N), dtype=a.dtype)
                
            for i in range(M):
                for j in range(N):
                    result_data[i, j] = np.dot(a[i, :], b[:, j])
        else:
            result_data = np.matmul(a, b)

        return Tensor(result_data)
        ### END SOLUTION

    def __matmul__(self, other):
        """Enable @ operator for matrix multiplication."""
        return self.matmul(other)
    