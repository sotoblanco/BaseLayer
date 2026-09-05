class DynamoTable:
    def __init__(self, name, hash_key, range_key=None):
        self.name = name
        self.hash_key = hash_key
        self.range_key = range_key
        self._data = {}

    def key_of(self, item):
        hash_value = item[self.hash_key]
        if self.range_key is None:
            return (hash_value,)
        return (hash_value, item[self.range_key])

    def put(self, item):
        item = dict(item)
        hash_value = item[self.hash_key]
        if self.range_key is None:
            self._data[hash_value] = item
            return
        range_value = item[self.range_key]
        if hash_value not in self._data:
            self._data[hash_value] = {}
        self._data[hash_value][range_value] = item

    def batch_write(self, items):
        for item in items:
            self.put(item)
