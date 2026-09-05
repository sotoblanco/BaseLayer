def classify(value):
    if isinstance(value, (str, bytes)):
        return "unstructured"
    if not isinstance(value, dict):
        raise TypeError("value must be dict, str, or bytes")
    for item in value.values():
        if isinstance(item, (dict, list)):
            return "semi-structured"
    return "structured"
