def ingest_raw_data() -> str:
    content = "x,y\n1.0,2.0\n2.0,4.0\n3.0,6.0\n4.0,8.0\n"
    with open("dataset.csv", "w", encoding="utf-8") as f:
        f.write(content)
    return "dataset.csv"

if __name__ == "__main__":
    ingest_raw_data()
