class Table:
    def __init__(self, name, primary_key):
        self.name = name
        self.primary_key = primary_key
        self._rows = {}

    def insert(self, row):
        pass

    def get(self, key):
        pass
