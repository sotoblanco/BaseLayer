class ObjectStore:
    def __init__(self):
        self._objects = {}

    def put(self, key, body):
        pass

    def get(self, key, version=None):
        pass

    def list_keys(self, prefix=""):
        pass
