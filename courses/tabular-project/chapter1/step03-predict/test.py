import os
from main import generate_predictions

def test_predictions():
    generate_predictions()
    assert os.path.exists("predictions.csv"), "predictions.csv was not created"
    with open("predictions.csv", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]
    assert lines[0] == "x,y,y_pred"
    assert len(lines) == 5
    assert lines[1] == "1.0,2.0,2.0"
    assert lines[4] == "4.0,8.0,8.0"

if __name__ == "__main__":
    test_predictions()
    print("Prediction tests passed.")
