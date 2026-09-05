def test_transact_put_and_delete():
    t = DynamoTable("Forum", "pk", "sk")
    t.put({"pk": "THREAD#t1", "sk": "REPLY#draft", "body": "wip"})
    t.transact_write(
        [
            {"put": {"pk": "THREAD#t1", "sk": "REPLY#r1", "body": "hi"}},
            {"delete": {"pk": "THREAD#t1", "sk": "REPLY#draft"}},
        ]
    )
    assert t.get({"pk": "THREAD#t1", "sk": "REPLY#r1"})["body"] == "hi"
    assert t.get({"pk": "THREAD#t1", "sk": "REPLY#draft"}) is None
    print("transact apply ok")


def test_transact_rollback():
    t = DynamoTable("Forum", "pk", "sk")
    t.put({"pk": "THREAD#t1", "sk": "REPLY#r1", "body": "hi"})
    try:
        t.transact_write(
            [
                {"put": {"pk": "THREAD#t1", "sk": "REPLY#r2", "body": "new"}},
                {"nope": True},
            ]
        )
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "unknown action" in str(exc)
    assert t.get({"pk": "THREAD#t1", "sk": "REPLY#r1"})["body"] == "hi"
    assert t.get({"pk": "THREAD#t1", "sk": "REPLY#r2"}) is None
    print("transact rollback ok")


def test_transact_missing_hash_rolls_back():
    t = DynamoTable("Forum", "pk", "sk")
    t.put({"pk": "THREAD#t1", "sk": "REPLY#r1", "body": "hi"})
    try:
        t.transact_write(
            [
                {"delete": {"pk": "THREAD#t1", "sk": "REPLY#r1"}},
                {"put": {"sk": "REPLY#r2", "body": "broken"}},
            ]
        )
        assert False, "expected KeyError"
    except KeyError:
        pass
    assert t.get({"pk": "THREAD#t1", "sk": "REPLY#r1"})["body"] == "hi"
    print("transact key rollback ok")
