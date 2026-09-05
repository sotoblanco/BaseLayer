def test_query_sorts_range():
    t = DynamoTable("Forum", "pk", "sk")
    t.put({"pk": "FORUM#general", "sk": "THREAD#t2", "title": "Second"})
    t.put({"pk": "FORUM#general", "sk": "THREAD#t1", "title": "First"})
    t.put({"pk": "FORUM#other", "sk": "THREAD#t9", "title": "Other"})
    titles = [item["title"] for item in t.query("FORUM#general")]
    assert titles == ["First", "Second"]
    print("query sort ok")


def test_query_reverse():
    t = DynamoTable("Forum", "pk", "sk")
    t.put({"pk": "FORUM#general", "sk": "THREAD#t1", "title": "First"})
    t.put({"pk": "FORUM#general", "sk": "THREAD#t2", "title": "Second"})
    titles = [
        item["title"] for item in t.query("FORUM#general", scan_index_forward=False)
    ]
    assert titles == ["Second", "First"]
    print("query reverse ok")


def test_query_missing_and_hash_only():
    t = DynamoTable("Forum", "pk", "sk")
    assert t.query("FORUM#missing") == []
    forums = DynamoTable("ForumMeta", "name")
    forums.put({"name": "general", "desc": "hello"})
    assert forums.query("general")[0]["desc"] == "hello"
    assert forums.query("missing") == []
    print("query missing ok")
