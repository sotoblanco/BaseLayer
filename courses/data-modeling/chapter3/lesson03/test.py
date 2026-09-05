def test_get_and_copy():
    t = DynamoTable("ProductCatalog", "category", "product_id")
    t.put({"category": "laptops", "product_id": "p1", "name": "X1"})
    item = t.get({"category": "laptops", "product_id": "p1"})
    assert item == {"category": "laptops", "product_id": "p1", "name": "X1"}
    item["name"] = "mutated"
    assert t.get({"category": "laptops", "product_id": "p1"})["name"] == "X1"
    print("get ok")


def test_get_missing():
    t = DynamoTable("ProductCatalog", "category", "product_id")
    assert t.get({"category": "laptops", "product_id": "p1"}) is None
    t.put({"category": "laptops", "product_id": "p1", "name": "X1"})
    assert t.get({"category": "phones", "product_id": "p1"}) is None
    print("get missing ok")


def test_get_hash_only():
    t = DynamoTable("Forum", "name")
    t.put({"name": "general", "desc": "hello"})
    assert t.get({"name": "general"})["desc"] == "hello"
    print("get hash only ok")


def test_scan():
    t = DynamoTable("ProductCatalog", "category", "product_id")
    t.put({"category": "laptops", "product_id": "p1", "name": "X1"})
    t.put({"category": "phones", "product_id": "p3", "name": "Pixel"})
    names = {item["name"] for item in t.scan()}
    assert names == {"X1", "Pixel"}
    print("scan ok")
