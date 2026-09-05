def test_log_replay():
    log = Log()
    assert log.append({"event": "run"}) == 0
    assert log.append({"event": "submit"}) == 1
    assert log.read() == [{"event": "run"}, {"event": "submit"}]
    assert log.read() == [{"event": "run"}, {"event": "submit"}]
    assert log.read(start=1) == [{"event": "submit"}]
    assert log.read(start=0, limit=1) == [{"event": "run"}]
    print("log replay ok")


def test_queue_consumes():
    q = Queue()
    q.send({"job": "grade"})
    q.send({"job": "hint"})
    assert q.pop() == {"job": "grade"}
    assert q.pop() == {"job": "hint"}
    assert q.pop() is None
    print("queue consume ok")
