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

    def __contains__(self, key):
        return key in self._rows


class Database:
    def __init__(self):
        self.tables = {}

    def add_table(self, table):
        self.tables[table.name] = table

    def insert(self, table_name, row, foreign_keys=None):
        if foreign_keys:
            for field, parent_name in foreign_keys.items():
                parent = self.tables[parent_name]
                if row[field] not in parent:
                    raise ValueError("foreign key violation")
        self.tables[table_name].insert(row)
