import os
from main import ingest_raw_data

def test_ingest():
    ingest_raw_data()
    assert os.path.exists("dataset.csv"), "dataset.csv was not created"
    with open("dataset.csv", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]
    assert lines[0] == "x,y", f"Expected header x,y, got {lines[0]}"
    assert len(lines) == 5, f"Expected 5 lines, got {len(lines)}"

if __name__ == "__main__":
    test_ingest()
    print("Ingest tests passed.")
