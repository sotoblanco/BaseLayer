def test_inner_join_match():
    courses = Table("courses", "id")
    exercises = Table("exercises", "id")
    courses.insert({"id": 10, "slug": "data-modeling"})
    exercises.insert({"id": 100, "course_id": 10, "title": "Classify"})
    rows = inner_join(exercises, courses, "course_id", "id")
    assert len(rows) == 1
    assert rows[0]["exercises.title"] == "Classify"
    assert rows[0]["courses.slug"] == "data-modeling"
    assert rows[0]["exercises.course_id"] == 10
    print("join match ok")


def test_inner_join_skips_orphans():
    courses = Table("courses", "id")
    exercises = Table("exercises", "id")
    courses.insert({"id": 10, "slug": "data-modeling"})
    exercises.insert({"id": 100, "course_id": 10, "title": "Classify"})
    exercises.insert({"id": 101, "course_id": 99, "title": "Orphan"})
    rows = inner_join(exercises, courses, "course_id", "id")
    assert len(rows) == 1
    assert rows[0]["exercises.id"] == 100
    print("orphan skip ok")


def test_inner_join_empty():
    courses = Table("courses", "id")
    exercises = Table("exercises", "id")
    assert inner_join(exercises, courses, "course_id", "id") == []
    print("empty join ok")
