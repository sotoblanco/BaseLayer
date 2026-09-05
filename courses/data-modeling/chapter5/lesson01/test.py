def test_put_versions():
    store = ObjectStore()
    assert store.put("main.py", b"pass") == 1
    assert store.put("main.py", b"def classify") == 2
    assert store.get("main.py") == b"def classify"
    assert store.get("main.py", 1) == b"pass"
    print("versions ok")


def test_missing():
    store = ObjectStore()
    try:
        store.get("missing")
        assert False, "expected KeyError"
    except KeyError:
        pass
    store.put("main.py", b"pass")
    try:
        store.get("main.py", 2)
        assert False, "expected KeyError"
    except KeyError:
        pass
    print("missing ok")


def test_list_prefix():
    store = ObjectStore()
    store.put("courses/data-modeling/main.py", b"a")
    store.put("courses/tinytorch/main.py", b"b")
    store.put("readme.md", b"c")
    assert store.list_keys("courses/") == [
        "courses/data-modeling/main.py",
        "courses/tinytorch/main.py",
    ]
    print("list prefix ok")
