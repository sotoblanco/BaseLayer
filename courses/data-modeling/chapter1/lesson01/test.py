def test_structured_user():
    assert classify({"id": 1, "username": "soto", "email": "a@b.com"}) == "structured"
    print("structured user ok")


def test_semi_structured_metadata():
    lesson = {"slug": "lesson01", "metadata": {"exercise_type": "code"}}
    assert classify(lesson) == "semi-structured"
    nested_list = {"slug": "lesson01", "files": ["main.py", "test.py"]}
    assert classify(nested_list) == "semi-structured"
    print("semi-structured metadata ok")


def test_unstructured():
    assert classify("# Lesson 1\n\nImplement classify") == "unstructured"
    assert classify(b"\x89PNG") == "unstructured"
    print("unstructured ok")


def test_rejects_other_types():
    try:
        classify(42)
        assert False, "expected TypeError"
    except TypeError:
        pass
    try:
        classify([1, 2, 3])
        assert False, "expected TypeError"
    except TypeError:
        pass
    print("type errors ok")
