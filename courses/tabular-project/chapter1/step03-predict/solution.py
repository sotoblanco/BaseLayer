import scaled_data

def generate_predictions() -> str:
    rows = ["x,y,y_pred"]
    with open("dataset.csv", encoding="utf-8") as f:
        lines = [line.strip().split(",") for line in f if line.strip()]
    for row in lines[1:]:
        x = float(row[0])
        y = float(row[1])
        y_pred = 2.0 * x
        rows.append(f"{x},{y},{y_pred}")

    with open("predictions.csv", "w", encoding="utf-8") as f:
        f.write("\n".join(rows) + "\n")
    return "predictions.csv"

if __name__ == "__main__":
    generate_predictions()
