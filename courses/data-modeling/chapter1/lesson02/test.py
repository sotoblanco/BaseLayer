USER_SCHEMA = {"id": int, "username": str, "email": str, "role": str}


def test_projects_schema_fields():
    row = {
        "id": 1,
        "username": "soto",
        "email": "soto@example.com",
        "role": "student",
        "extra": "drop me",
    }
    assert validate(row, USER_SCHEMA) == {
        "id": 1,
        "username": "soto",
        "email": "soto@example.com",
        "role": "student",
    }
    print("project ok")


def test_missing_field():
    row = {"id": 1, "username": "soto", "email": "soto@example.com"}
    try:
        validate(row, USER_SCHEMA)
        assert False, "expected KeyError"
    except KeyError as exc:
        assert "role" in str(exc)
    print("missing field ok")


def test_wrong_type():
    row = {
        "id": "1",
        "username": "soto",
        "email": "soto@example.com",
        "role": "student",
    }
    try:
        validate(row, USER_SCHEMA)
        assert False, "expected TypeError"
    except TypeError:
        pass
    print("wrong type ok")
