import copy


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

    def delete(self, key):
        hash_value = key[self.hash_key]
        if self.range_key is None:
            item = self._data.pop(hash_value, None)
            return dict(item) if item else None
        bucket = self._data.get(hash_value)
        if not bucket:
            return None
        item = bucket.pop(key[self.range_key], None)
        if not bucket:
            del self._data[hash_value]
        return dict(item) if item else None

    def transact_write(self, actions):
        snapshot = copy.deepcopy(self._data)
        try:
            for action in actions:
                if "put" in action:
                    self.put(action["put"])
                elif "delete" in action:
                    self.delete(action["delete"])
                else:
                    raise ValueError("unknown action")
        except Exception:
            self._data = snapshot
            raise
