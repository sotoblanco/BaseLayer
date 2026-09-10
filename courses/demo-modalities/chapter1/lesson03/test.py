from main import normalize_pixel

result = normalize_pixel([255, 128, 0])
assert result == [1.0, 0.50196, 0.0], f"Expected [1.0, 0.50196, 0.0], got {result}"

edge = normalize_pixel([255, 0, 0])
assert edge[0] == 1.0 and edge[1] == 0.0 and edge[2] == 0.0
