# Lesson 2: Streams & Queues (Kinesis Log vs. SQS Queue)

### The Story: The Disappearing Telemetry Mystery

BaseLayer engineers built two background systems:
1. **The Sandbox Grading Service:** Dispatches student test runs to isolated Docker sandboxes.
2. **The Real-Time Analytics Pipeline:** Tracks lesson completion rates, student friction points, and leaderboard standings.

A junior developer decided to connect both systems to a single AWS SQS Queue:
```
           ┌───> Sandbox Worker (Grading)
[Queue] ───┤
           └───> Analytics Engine (Leaderboard)
```

The bug was baffling:
* 50% of student code runs were randomly skipped by the grading worker.
* 50% of student completions never showed up on the leaderboard.

Why? **Because a Message Queue is destructive!** When the Analytics Engine popped a "code submission" message to update the leaderboard, the message was permanently deleted from the queue. The Sandbox Worker never knew the submission existed!

The team realized they had conflated two fundamentally different data models: **a Task Queue** and an **Event Log**.

---

### The Data Modeling Concept: Destructive Queues vs. Append-Only Logs

Choosing between an event stream and a message queue is one of the most consequential decisions in data architecture:

| Feature | Message Queue (AWS SQS / RabbitMQ) | Event Log (AWS Kinesis / Apache Kafka) |
|---|---|---|
| **Mechanism** | Competing consumers: items are popped off FIFO. | Append-only commit log: items are written sequentially. |
| **Consumption** | **Destructive.** Once acknowledged, the message is permanently deleted from storage. | **Non-Destructive.** Multiple independent consumer groups read through the log by maintaining an **offset**. |
| **Replayability** | **Impossible.** You cannot rewind a queue. | **Complete.** A service can replay from offset `0` to rebuild state or recover from bugs. |
| **Ideal Workload** | Work queues (e.g. background job dispatching, email sending). | Event sourcing, analytics pipelines, Change Data Capture (CDC). |

---

### The Problem We Need to Solve

You will implement both models side-by-side to master their differing mechanics:

#### 1. `Log` (The Kinesis/Kafka Model):
- **`append(self, record)`**:
  - Appends `record` to an internal list.
  - Returns the **offset** (0-based index) of the newly written record.
- **`read(self, start=0, limit=None)`**:
  - Returns a slice of records starting at index `start` up to `start + limit`.
  - **Does NOT remove records.** Subsequent reads must yield the identical records.

#### 2. `Queue` (The SQS Model):
- **`send(self, record)`**:
  - Enqueues `record` at the end of the queue.
- **`pop(self)`**:
  - Dequeues and returns the oldest record (FIFO: First-In, First-Out).
  - If the queue is empty, returns `None`.
  - **Removes the item permanently.**

---

### Your Task

- [ ] Implement `Log.append(self, record)` returning the 0-based offset
- [ ] Implement `Log.read(self, start=0, limit=None)` as a non-destructive read/replay
- [ ] Implement `Queue.send(self, record)`
- [ ] Implement `Queue.pop(self)` removing the oldest record or returning `None` when empty

---

### Example

```py
# 1. Event Log (Replayable)
log = Log()
offset0 = log.append({"event": "code_run", "student": "soto"})
offset1 = log.append({"event": "lesson_completed", "student": "soto"})

# Service A (Leaderboard) reads stream
print(log.read())
# => [{'event': 'code_run', ...}, {'event': 'lesson_completed', ...}]

# Service B (Analytics) replays the exact same stream without data loss!
print(log.read(start=1))
# => [{'event': 'lesson_completed', ...}]

# 2. Task Queue (Destructive)
queue = Queue()
queue.send({"job_id": 1, "task": "run_sandbox"})

# Worker 1 consumes the job
job = queue.pop()
print(job)  # => {'job_id': 1, 'task': 'run_sandbox'}

# Job is gone; Worker 2 gets nothing
assert queue.pop() is None
```
