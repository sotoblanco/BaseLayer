class DynamoTable:
    def __init__(self, name, hash_key, range_key=None):
        self.name = name
        self.hash_key = hash_key
        self.range_key = range_key
        self._data = {}

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

    def get(self, key):
        hash_value = key[self.hash_key]
        if self.range_key is None:
            item = self._data.get(hash_value)
            return dict(item) if item else None
        bucket = self._data.get(hash_value)
        if not bucket:
            return None
        item = bucket.get(key[self.range_key])
        return dict(item) if item else None

    def scan(self):
        if self.range_key is None:
            return [dict(item) for item in self._data.values()]
        items = []
        for bucket in self._data.values():
            items.extend(dict(item) for item in bucket.values())
        return items
