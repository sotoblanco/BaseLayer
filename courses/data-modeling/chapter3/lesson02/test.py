def test_put_hash_range():
    t = DynamoTable("ProductCatalog", "category", "product_id")
    item = {"category": "laptops", "product_id": "p1", "name": "X1"}
    t.put(item)
    item["name"] = "mutated"
    stored = t._data["laptops"]["p1"]
    assert stored["name"] == "X1"
    print("put hash/range ok")


def test_put_overwrites():
    t = DynamoTable("ProductCatalog", "category", "product_id")
    t.put({"category": "laptops", "product_id": "p1", "name": "X1"})
    t.put({"category": "laptops", "product_id": "p1", "name": "X1b"})
    assert t._data["laptops"]["p1"]["name"] == "X1b"
    print("overwrite ok")


def test_put_hash_only():
    t = DynamoTable("Forum", "name")
    t.put({"name": "general", "desc": "hello"})
    assert t._data["general"]["desc"] == "hello"
    print("put hash only ok")


def test_batch_write():
    t = DynamoTable("ProductCatalog", "category", "product_id")
    t.batch_write(
        [
            {"category": "laptops", "product_id": "p1", "name": "X1"},
            {"category": "laptops", "product_id": "p2", "name": "X2"},
            {"category": "phones", "product_id": "p3", "name": "Pixel"},
        ]
    )
    assert t._data["laptops"]["p1"]["name"] == "X1"
    assert t._data["laptops"]["p2"]["name"] == "X2"
    assert t._data["phones"]["p3"]["name"] == "Pixel"
    print("batch_write ok")
