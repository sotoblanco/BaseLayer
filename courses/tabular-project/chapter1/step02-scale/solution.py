def scale_features() -> str:
    xs = []
    with open("dataset.csv", encoding="utf-8") as f:
        lines = [line.strip().split(",") for line in f if line.strip()]
    for row in lines[1:]:
        xs.append(float(row[0]))

    mean_x = sum(xs) / len(xs)
    scaled = [round(x - mean_x, 4) for x in xs]
    code = f"MEAN_X = {mean_x}\nSCALED_X = {scaled}\ndef get_scaled_x() -> list[float]:\n    return {scaled}\n"
    with open("scaled_data.py", "w", encoding="utf-8") as f:
        f.write(code)
    return "scaled_data.py"

if __name__ == "__main__":
    scale_features()
