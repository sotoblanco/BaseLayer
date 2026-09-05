def test_update_fields():
    users = Table("users", "id")
    users.insert({"id": 1, "username": "soto", "role": "student"})
    out = users.update(1, role="admin")
    assert out == {"id": 1, "username": "soto", "role": "admin"}
    assert users.get(1)["role"] == "admin"
    print("update ok")


def test_update_missing():
    users = Table("users", "id")
    try:
        users.update(1, role="admin")
        assert False, "expected KeyError"
    except KeyError:
        pass
    print("update missing ok")


def test_cannot_change_pk():
    users = Table("users", "id")
    users.insert({"id": 1, "username": "soto"})
    try:
        users.update(1, id=2)
        assert False, "expected ValueError"
    except ValueError:
        pass
    assert users.get(1)["username"] == "soto"
    print("pk immutable ok")


def test_delete():
    users = Table("users", "id")
    users.insert({"id": 1, "username": "soto"})
    users.delete(1)
    try:
        users.get(1)
        assert False, "expected KeyError"
    except KeyError:
        pass
    print("delete ok")


def test_delete_missing():
    users = Table("users", "id")
    try:
        users.delete(1)
        assert False, "expected KeyError"
    except KeyError:
        pass
    print("delete missing ok")
