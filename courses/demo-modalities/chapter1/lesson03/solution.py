def normalize_pixel(rgb_values=[255, 128, 0]):
    return [round(v / 255.0, 5) for v in rgb_values]
