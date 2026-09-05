class Client:
    def __init__(self):
        self._data = {}

    def put(self, key, entity):
        self._data[key] = dict(entity)

    def get(self, key):
        item = self._data.get(key)
        return dict(item) if item else None

    def transaction(self):
        pass


class Transaction:
    def __init__(self, client):
        pass

    def __enter__(self):
        pass

    def put(self, key, entity):
        pass

    def delete(self, key):
        pass

    def __exit__(self, exc_type, exc, tb):
        pass
