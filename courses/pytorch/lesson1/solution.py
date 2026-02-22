# Simple Tensor class to simulate PyTorch tensor behavior
class Tensor:
    def __init__(self, data):
        self.data = data
    
    @property
    def shape(self):
        if not self.data:
            return (0,)
        rows = len(self.data)
        cols = len(self.data[0]) if isinstance(self.data[0], list) else 0
        return (rows, cols) if cols else (rows,)


def create_tensor():
    return Tensor([[1, 2, 3], [4, 5, 6]])
