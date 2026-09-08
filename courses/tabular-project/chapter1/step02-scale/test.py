import os
from main import scale_features

def test_scale():
    scale_features()
    assert os.path.exists("scaled_data.py"), "scaled_data.py was not created"
    import scaled_data
    assert hasattr(scaled_data, "MEAN_X")
    assert scaled_data.MEAN_X == 2.5
    scaled = scaled_data.get_scaled_x()
    assert len(scaled) == 4
    assert abs(sum(scaled)) < 1e-5

if __name__ == "__main__":
    test_scale()
    print("Scale tests passed.")
