class ObjectStore:
    def __init__(self):
        self._objects = {}

    def put(self, key, body):
        versions = self._objects.setdefault(key, [])
        versions.append(bytes(body))
        return len(versions)

    def get(self, key, version=None):
        versions = self._objects.get(key)
        if not versions:
            raise KeyError(key)
        if version is None:
            return versions[-1]
        if version < 1 or version > len(versions):
            raise KeyError(version)
        return versions[version - 1]

    def list_keys(self, prefix=""):
        return sorted(key for key in self._objects if key.startswith(prefix))
