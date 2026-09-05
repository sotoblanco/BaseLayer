def validate(row, schema):
    out = {}
    for field, typ in schema.items():
        if field not in row:
            raise KeyError(field)
        if not isinstance(row[field], typ):
            raise TypeError(field)
        out[field] = row[field]
    return out
