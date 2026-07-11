"""Backend API tests for Luxur & Lavish Catalogue Return Management System."""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://lending-management.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def h(token):
    return {"Authorization": f"Bearer {token}"}


# --- Auth ---
class TestAuth:
    def test_login_ok(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and d["user"]["username"] == "admin" and d["user"]["role"] == "admin"

    def test_login_bad(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code in (401, 403)

    def test_me_ok(self, h):
        r = requests.get(f"{API}/auth/me", headers=h)
        assert r.status_code == 200
        assert r.json()["username"] == "admin"


# --- Catalogues ---
class TestCatalogue:
    def test_crud(self, h):
        name = f"TEST_CAT_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/catalogues", json={"name": name, "brand": "B", "category": "C", "total_quantity": 5}, headers=h)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["available_quantity"] == 5 and c["issued_quantity"] == 0 and c["returned_count"] == 0
        cid = c["id"]

        r = requests.get(f"{API}/catalogues", headers=h)
        assert r.status_code == 200 and any(x["id"] == cid for x in r.json())

        # duplicate
        r = requests.post(f"{API}/catalogues", json={"name": name, "total_quantity": 1}, headers=h)
        assert r.status_code == 400

        r = requests.put(f"{API}/catalogues/{cid}", json={"total_quantity": 10}, headers=h)
        assert r.status_code == 200 and r.json()["available_quantity"] == 10

        r = requests.delete(f"{API}/catalogues/{cid}", headers=h)
        assert r.status_code == 200

    def test_auth_required(self):
        r = requests.get(f"{API}/catalogues")
        assert r.status_code in (401, 403)


# --- Customers ---
class TestCustomer:
    def test_crud_and_duplicate(self, h):
        mob = f"9{uuid.uuid4().int % 10**9:09d}"
        name = f"TEST_CUST_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/customers", json={"name": name, "mobile": mob}, headers=h)
        assert r.status_code == 200
        cid = r.json()["id"]

        # duplicate mobile
        r2 = requests.post(f"{API}/customers", json={"name": name + "X", "mobile": mob}, headers=h)
        assert r2.status_code == 400

        r = requests.put(f"{API}/customers/{cid}", json={"name": name + "_U", "mobile": mob}, headers=h)
        assert r.status_code == 200 and r.json()["name"] == name + "_U"

        r = requests.delete(f"{API}/customers/{cid}", headers=h)
        assert r.status_code == 200


# --- Transactions ---
class TestTransactions:
    def test_issue_and_return_flow(self, h):
        # Use brand-new auto-create names
        cust_name = f"TEST_AUTO_CUST_{uuid.uuid4().hex[:6]}"
        cat1 = f"TEST_AUTO_CAT1_{uuid.uuid4().hex[:6]}"
        cat2 = f"TEST_AUTO_CAT2_{uuid.uuid4().hex[:6]}"
        payload = {
            "customer_name": cust_name,
            "customer_mobile": "",
            "items": [
                {"catalogue_name": cat1, "company": "ACME", "quantity": 2},
                {"catalogue_name": cat2, "company": "BCO", "quantity": 1},
            ],
        }
        r = requests.post(f"{API}/transactions/issue", json=payload, headers=h)
        assert r.status_code == 200, r.text
        txn = r.json()
        assert len(txn["items"]) == 2 and txn["status"] == "pending"
        assert txn["customer_name"].lower() == cust_name.lower()
        txn_id = txn["id"]

        # Inventory check on auto-created catalogue
        cats = requests.get(f"{API}/catalogues", params={"q": cat1}, headers=h).json()
        assert cats and cats[0]["issued_quantity"] == 2 and cats[0]["available_quantity"] == 0

        # Pending search by partial customer name (case-insensitive)
        r = requests.get(f"{API}/transactions/pending", params={"customer": cust_name[:8].lower()}, headers=h)
        assert r.status_code == 200
        assert any(t["id"] == txn_id for t in r.json())

        # Partial return: only first item
        r = requests.post(f"{API}/transactions/return", json={"transaction_id": txn_id, "item_indexes": [0]}, headers=h)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "partial"
        assert d["items"][0]["status"] == "returned" and d["items"][1]["status"] == "pending"

        # Inventory updated
        cats = requests.get(f"{API}/catalogues", params={"q": cat1}, headers=h).json()
        assert cats[0]["available_quantity"] == 2 and cats[0]["issued_quantity"] == 0 and cats[0]["returned_count"] == 2

        # Return remaining via transaction_id field (TXN-...)
        r = requests.post(f"{API}/transactions/return", json={"transaction_id": d["transaction_id"], "item_indexes": [1]}, headers=h)
        assert r.status_code == 200 and r.json()["status"] == "returned"

        # List with filters
        r = requests.get(f"{API}/transactions", params={"status": "returned", "customer": cust_name}, headers=h)
        assert r.status_code == 200 and any(t["id"] == txn_id for t in r.json())

        r = requests.get(f"{API}/transactions", params={"q": cat1}, headers=h)
        assert r.status_code == 200 and any(t["id"] == txn_id for t in r.json())

    def test_issue_validation(self, h):
        r = requests.post(f"{API}/transactions/issue", json={"customer_name": "X", "items": []}, headers=h)
        assert r.status_code == 400


# --- Dashboard ---
class TestDashboard:
    def test_stats(self, h):
        r = requests.get(f"{API}/dashboard/stats", headers=h)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_catalogues_available", "total_catalogues_issued", "returned_today", "pending_returns", "total_customers", "overdue_returns", "recent_transactions"]:
            assert k in d
        assert isinstance(d["recent_transactions"], list)

    def test_charts(self, h):
        r = requests.get(f"{API}/dashboard/charts", headers=h)
        assert r.status_code == 200
        d = r.json()
        assert len(d["issue_trend"]) == 7 and len(d["return_trend"]) == 7
        assert isinstance(d["most_borrowed"], list)


# --- Search ---
class TestSearch:
    def test_search(self, h):
        r = requests.get(f"{API}/search", params={"q": "TEST"}, headers=h)
        assert r.status_code == 200
        d = r.json()
        assert set(d.keys()) >= {"customers", "catalogues", "transactions"}

    def test_search_auth(self):
        r = requests.get(f"{API}/search", params={"q": "x"})
        assert r.status_code in (401, 403)
