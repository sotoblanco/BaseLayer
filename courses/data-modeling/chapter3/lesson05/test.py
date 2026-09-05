def test_update():
    t = DynamoTable("ProductCatalog", "category", "product_id")
    t.put({"category": "laptops", "product_id": "p1", "name": "X1", "price": 999})
    out = t.update({"category": "laptops", "product_id": "p1"}, price=899)
    assert out["price"] == 899
    assert t.get({"category": "laptops", "product_id": "p1"})["price"] == 899
    print("update ok")


def test_update_missing_and_key_change():
    t = DynamoTable("ProductCatalog", "category", "product_id")
    try:
        t.update({"category": "laptops", "product_id": "p1"}, price=1)
        assert False, "expected KeyError"
    except KeyError:
        pass
    t.put({"category": "laptops", "product_id": "p1", "name": "X1"})
    try:
        t.update({"category": "laptops", "product_id": "p1"}, category="phones")
        assert False, "expected ValueError"
    except ValueError:
        pass
    print("update errors ok")


def test_delete():
    t = DynamoTable("ProductCatalog", "category", "product_id")
    t.put({"category": "laptops", "product_id": "p1", "name": "X1"})
    t.put({"category": "laptops", "product_id": "p2", "name": "X2"})
    deleted = t.delete({"category": "laptops", "product_id": "p1"})
    assert deleted["name"] == "X1"
    assert t.get({"category": "laptops", "product_id": "p1"}) is None
    assert t.get({"category": "laptops", "product_id": "p2"})["name"] == "X2"
    assert t.delete({"category": "laptops", "product_id": "p1"}) is None
    print("delete ok")


def test_delete_hash_only():
    t = DynamoTable("Forum", "name")
    t.put({"name": "general", "desc": "hello"})
    assert t.delete({"name": "general"})["desc"] == "hello"
    assert t.get({"name": "general"}) is None
    print("delete hash only ok")
