class Table:
    def __init__(self, name, primary_key):
        self.name = name
        self.primary_key = primary_key
        self._rows = {}

    def insert(self, row):
        if self.primary_key not in row:
            raise KeyError(self.primary_key)
        key = row[self.primary_key]
        if key in self._rows:
            raise ValueError("duplicate primary key")
        self._rows[key] = dict(row)

    def get(self, key):
        if key not in self._rows:
            raise KeyError(key)
        return dict(self._rows[key])

    def all(self):
        return [dict(row) for row in self._rows.values()]


def inner_join(left, right, left_key, right_key):
    result = []
    for left_row in left.all():
        for right_row in right.all():
            if left_row[left_key] == right_row[right_key]:
                combined = {}
                for field, value in left_row.items():
                    combined[f"{left.name}.{field}"] = value
                for field, value in right_row.items():
                    combined[f"{right.name}.{field}"] = value
                result.append(combined)
    return result
