class Log:
    def __init__(self):
        self._records = []

    def append(self, record):
        self._records.append(record)
        return len(self._records) - 1

    def read(self, start=0, limit=None):
        end = None if limit is None else start + limit
        return list(self._records[start:end])


class Queue:
    def __init__(self):
        self._records = []

    def send(self, record):
        self._records.append(record)

    def pop(self):
        if not self._records:
            return None
        return self._records.pop(0)
