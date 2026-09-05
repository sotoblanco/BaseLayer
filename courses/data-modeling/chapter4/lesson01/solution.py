import copy


class Client:
    def __init__(self):
        self._data = {}

    def put(self, key, entity):
        self._data[key] = dict(entity)

    def get(self, key):
        item = self._data.get(key)
        return dict(item) if item else None

    def transaction(self):
        return Transaction(self)


class Transaction:
    def __init__(self, client):
        self._client = client
        self._ops = []
        self._snapshot = None

    def __enter__(self):
        self._snapshot = copy.deepcopy(self._client._data)
        return self

    def put(self, key, entity):
        self._ops.append(("put", key, dict(entity)))

    def delete(self, key):
        self._ops.append(("delete", key, None))

    def __exit__(self, exc_type, exc, tb):
        if exc_type is not None:
            self._client._data = self._snapshot
            self._ops.clear()
            return False
        try:
            for op, key, entity in self._ops:
                if op == "put":
                    self._client._data[key] = entity
                else:
                    self._client._data.pop(key, None)
        except Exception:
            self._client._data = self._snapshot
            raise
        return False
