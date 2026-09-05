def test_insert_and_get():
    users = Table("users", "id")
    users.insert({"id": 1, "username": "soto"})
    row = users.get(1)
    assert row == {"id": 1, "username": "soto"}
    row["username"] = "mutated"
    assert users.get(1)["username"] == "soto"
    print("insert/get ok")


def test_missing_pk():
    users = Table("users", "id")
    try:
        users.insert({"username": "soto"})
        assert False, "expected KeyError"
    except KeyError:
        pass
    print("missing pk ok")


def test_duplicate_pk():
    users = Table("users", "id")
    users.insert({"id": 1, "username": "soto"})
    try:
        users.insert({"id": 1, "username": "other"})
        assert False, "expected ValueError"
    except ValueError:
        pass
    print("duplicate pk ok")


def test_missing_row():
    users = Table("users", "id")
    try:
        users.get(99)
        assert False, "expected KeyError"
    except KeyError:
        pass
    print("missing row ok")
