def test_commit_put_and_delete():
    client = Client()
    client.put(("Reply", "draft"), {"body": "wip"})
    with client.transaction() as tx:
        tx.put(("Thread", "t1"), {"title": "Hello"})
        tx.delete(("Reply", "draft"))
    assert client.get(("Thread", "t1"))["title"] == "Hello"
    assert client.get(("Reply", "draft")) is None
    print("commit ok")


def test_buffered_until_exit():
    client = Client()
    with client.transaction() as tx:
        tx.put(("Thread", "t1"), {"title": "Hello"})
        assert client.get(("Thread", "t1")) is None
    assert client.get(("Thread", "t1"))["title"] == "Hello"
    print("buffer ok")


def test_rollback_on_exception():
    client = Client()
    client.put(("Thread", "t1"), {"title": "old"})
    try:
        with client.transaction() as tx:
            tx.put(("Thread", "t1"), {"title": "new"})
            tx.delete(("Thread", "t1"))
            raise RuntimeError("boom")
    except RuntimeError:
        pass
    assert client.get(("Thread", "t1"))["title"] == "old"
    print("rollback ok")
