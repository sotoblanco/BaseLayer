def test_hash_and_range():
    catalog = DynamoTable("ProductCatalog", "category", "product_id")
    assert catalog.name == "ProductCatalog"
    assert catalog.hash_key == "category"
    assert catalog.range_key == "product_id"
    key = catalog.key_of({"category": "laptops", "product_id": "p1", "name": "X1"})
    assert key == ("laptops", "p1")
    print("hash/range ok")


def test_hash_only():
    forums = DynamoTable("Forum", "name")
    assert forums.range_key is None
    assert forums.key_of({"name": "general", "desc": "hello"}) == ("general",)
    print("hash only ok")


def test_missing_key_field():
    catalog = DynamoTable("ProductCatalog", "category", "product_id")
    try:
        catalog.key_of({"category": "laptops"})
        assert False, "expected KeyError"
    except KeyError:
        pass
    print("missing key ok")
