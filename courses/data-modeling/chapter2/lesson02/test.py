def _db():
    db = Database()
    db.add_table(Table("courses", "id"))
    db.add_table(Table("exercises", "id"))
    return db


def test_valid_fk():
    db = _db()
    db.insert("courses", {"id": 10, "slug": "data-modeling"})
    db.insert(
        "exercises",
        {"id": 100, "title": "Classify", "course_id": 10},
        foreign_keys={"course_id": "courses"},
    )
    assert db.tables["exercises"].get(100)["course_id"] == 10
    print("valid fk ok")


def test_fk_violation():
    db = _db()
    try:
        db.insert(
            "exercises",
            {"id": 100, "title": "Classify", "course_id": 10},
            foreign_keys={"course_id": "courses"},
        )
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "foreign key" in str(exc)
    print("fk violation ok")


def test_insert_without_fk():
    db = _db()
    db.insert("courses", {"id": 10, "slug": "data-modeling"})
    assert db.tables["courses"].get(10)["slug"] == "data-modeling"
    print("insert without fk ok")
