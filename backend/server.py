from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

# --- Config ---
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALGO = 'HS256'
JWT_EXP_HOURS = 24
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Luxur & Lavish API")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("luxur")


# --- Helpers ---
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), h.encode())
    except Exception:
        return False


def make_token(user_id: str, username: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# --- Models ---
class LoginIn(BaseModel):
    username: str
    password: str


class CatalogueIn(BaseModel):
    name: str
    brand: Optional[str] = ""
    category: Optional[str] = ""
    total_quantity: int = 0
    description: Optional[str] = ""
    image_url: Optional[str] = ""


class CatalogueUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    total_quantity: Optional[int] = None
    description: Optional[str] = None
    image_url: Optional[str] = None


class CustomerIn(BaseModel):
    name: str
    mobile: Optional[str] = ""
    whatsapp: Optional[str] = ""
    address: Optional[str] = ""
    notes: Optional[str] = ""


class IssueItem(BaseModel):
    catalogue_name: str
    company: Optional[str] = ""
    quantity: int = 1
    remarks: Optional[str] = ""


class IssueIn(BaseModel):
    customer_name: str
    customer_mobile: Optional[str] = ""
    items: List[IssueItem]
    issue_date: Optional[str] = None
    expected_return_date: Optional[str] = None
    remarks: Optional[str] = ""


class ReturnIn(BaseModel):
    transaction_id: str
    item_indexes: List[int]  # which items to return
    return_remarks: Optional[str] = ""


# --- Auth ---
@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"username": body.username.lower().strip()})
    if not user or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = make_token(user["id"], user["username"])
    return {"token": token, "user": {"id": user["id"], "username": user["username"], "role": user["role"]}}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout(user=Depends(get_current_user)):
    return {"ok": True}


# --- Catalogues ---
@api.get("/catalogues")
async def list_catalogues(q: Optional[str] = None, category: Optional[str] = None, user=Depends(get_current_user)):
    query: Dict[str, Any] = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    if category:
        query["category"] = category
    items = await db.catalogues.find(query, {"_id": 0}).sort("date_added", -1).to_list(2000)
    return items


@api.post("/catalogues")
async def create_catalogue(body: CatalogueIn, user=Depends(get_current_user)):
    existing = await db.catalogues.find_one({"name": {"$regex": f"^{body.name}$", "$options": "i"}}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Catalogue with this name already exists")
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "brand": body.brand or "",
        "category": body.category or "",
        "total_quantity": int(body.total_quantity or 0),
        "available_quantity": int(body.total_quantity or 0),
        "issued_quantity": 0,
        "returned_count": 0,
        "description": body.description or "",
        "image_url": body.image_url or "",
        "date_added": now_iso(),
    }
    await db.catalogues.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/catalogues/{cid}")
async def update_catalogue(cid: str, body: CatalogueUpdate, user=Depends(get_current_user)):
    cat = await db.catalogues.find_one({"id": cid}, {"_id": 0})
    if not cat:
        raise HTTPException(404, "Not found")
    upd: Dict[str, Any] = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "total_quantity" in upd:
        # No status-based locking. Recompute available = max(0, new_total - issued) so math stays consistent.
        new_total = int(upd["total_quantity"])
        issued = int(cat.get("issued_quantity", 0))
        upd["available_quantity"] = max(0, new_total - issued)
    await db.catalogues.update_one({"id": cid}, {"$set": upd})
    doc = await db.catalogues.find_one({"id": cid}, {"_id": 0})
    return doc


@api.delete("/catalogues/{cid}")
async def delete_catalogue(cid: str, user=Depends(get_current_user)):
    res = await db.catalogues.delete_one({"id": cid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# --- Customers ---
@api.get("/customers")
async def list_customers(q: Optional[str] = None, user=Depends(get_current_user)):
    query: Dict[str, Any] = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    items = await db.customers.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return items


@api.post("/customers")
async def create_customer(body: CustomerIn, user=Depends(get_current_user)):
    if body.mobile:
        existing = await db.customers.find_one({"mobile": body.mobile}, {"_id": 0})
        if existing:
            raise HTTPException(400, "Customer with this mobile already exists")
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "mobile": body.mobile or "",
        "whatsapp": body.whatsapp or "",
        "address": body.address or "",
        "notes": body.notes or "",
        "created_at": now_iso(),
    }
    await db.customers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/customers/{cid}")
async def update_customer(cid: str, body: CustomerIn, user=Depends(get_current_user)):
    upd = body.model_dump()
    await db.customers.update_one({"id": cid}, {"$set": upd})
    doc = await db.customers.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api.delete("/customers/{cid}")
async def delete_customer(cid: str, user=Depends(get_current_user)):
    res = await db.customers.delete_one({"id": cid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# --- Transactions: Issue ---
async def get_or_create_customer(name: str, mobile: str = "") -> Dict[str, Any]:
    name = name.strip()
    cust = await db.customers.find_one(
        {"name": {"$regex": f"^{name}$", "$options": "i"}}, {"_id": 0}
    )
    if cust:
        return cust
    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "mobile": mobile or "",
        "whatsapp": "",
        "address": "",
        "notes": "Auto-created from Issue",
        "created_at": now_iso(),
    }
    await db.customers.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def get_or_create_catalogue(name: str, company: str = "") -> Dict[str, Any]:
    name = name.strip()
    cat = await db.catalogues.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}}, {"_id": 0})
    if cat:
        return cat
    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "brand": company or "",
        "category": "",
        "total_quantity": 0,
        "available_quantity": 0,
        "issued_quantity": 0,
        "returned_count": 0,
        "description": "Auto-created via Issue",
        "image_url": "",
        "date_added": now_iso(),
    }
    await db.catalogues.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/transactions/issue")
async def issue_catalogues(body: IssueIn, user=Depends(get_current_user)):
    if not body.items:
        raise HTTPException(400, "At least one catalogue item required")

    customer = await get_or_create_customer(body.customer_name, body.customer_mobile or "")

    issue_date = body.issue_date or now_iso()
    expected = body.expected_return_date or (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    items_out = []
    for it in body.items:
        if it.quantity <= 0:
            raise HTTPException(400, f"Quantity must be positive for {it.catalogue_name}")
        cat = await get_or_create_catalogue(it.catalogue_name, it.company or "")
        # Auto-increase total if insufficient available (since auto-created may be 0)
        if cat["available_quantity"] < it.quantity:
            shortage = it.quantity - cat["available_quantity"]
            await db.catalogues.update_one(
                {"id": cat["id"]},
                {"$inc": {"total_quantity": shortage, "available_quantity": shortage}},
            )
            cat["total_quantity"] += shortage
            cat["available_quantity"] += shortage
        # Decrement available, increment issued
        await db.catalogues.update_one(
            {"id": cat["id"]},
            {"$inc": {"available_quantity": -it.quantity, "issued_quantity": it.quantity}},
        )
        items_out.append({
            "catalogue_id": cat["id"],
            "catalogue_name": cat["name"],
            "company": it.company or cat.get("brand", ""),
            "quantity": int(it.quantity),
            "returned_quantity": 0,
            "remarks": it.remarks or "",
            "status": "pending",
            "returned_at": None,
        })

    txn = {
        "id": str(uuid.uuid4()),
        "transaction_id": f"TXN-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        "customer_id": customer["id"],
        "customer_name": customer["name"],
        "customer_mobile": customer["mobile"],
        "items": items_out,
        "issue_date": issue_date,
        "expected_return_date": expected,
        "actual_return_date": None,
        "status": "pending",  # pending | partial | returned
        "remarks": body.remarks or "",
        "created_at": now_iso(),
    }
    await db.transactions.insert_one(txn)
    txn.pop("_id", None)
    return txn


# --- Transactions list & query ---
@api.get("/transactions")
async def list_transactions(
    q: Optional[str] = None,
    status: Optional[str] = None,
    customer: Optional[str] = None,
    user=Depends(get_current_user),
):
    query: Dict[str, Any] = {}
    if status and status != "all":
        query["status"] = status
    if customer:
        query["customer_name"] = {"$regex": customer, "$options": "i"}
    if q:
        query["$or"] = [
            {"customer_name": {"$regex": q, "$options": "i"}},
            {"transaction_id": {"$regex": q, "$options": "i"}},
            {"items.catalogue_name": {"$regex": q, "$options": "i"}},
        ]
    items = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return items


@api.get("/transactions/pending")
async def pending_transactions(customer: Optional[str] = None, user=Depends(get_current_user)):
    query: Dict[str, Any] = {"status": {"$in": ["pending", "partial"]}}
    if customer:
        query["customer_name"] = {"$regex": customer, "$options": "i"}
    items = await db.transactions.find(query, {"_id": 0}).sort("expected_return_date", 1).to_list(5000)
    return items


@api.post("/transactions/return")
async def return_items(body: ReturnIn, user=Depends(get_current_user)):
    txn = await db.transactions.find_one({"$or": [{"id": body.transaction_id}, {"transaction_id": body.transaction_id}]}, {"_id": 0})
    if not txn:
        raise HTTPException(404, "Transaction not found")
    items = txn["items"]
    returned_at = now_iso()
    for idx in body.item_indexes:
        if idx < 0 or idx >= len(items):
            continue
        item = items[idx]
        if item["status"] == "returned":
            continue
        qty = item["quantity"] - item.get("returned_quantity", 0)
        if qty <= 0:
            continue
        # Update catalogue inventory
        await db.catalogues.update_one(
            {"id": item["catalogue_id"]},
            {"$inc": {"available_quantity": qty, "issued_quantity": -qty, "returned_count": qty}},
        )
        item["returned_quantity"] = item["quantity"]
        item["status"] = "returned"
        item["returned_at"] = returned_at
        if body.return_remarks:
            item["remarks"] = (item.get("remarks", "") + " | Return: " + body.return_remarks).strip(" |")

    pending_count = sum(1 for i in items if i["status"] != "returned")
    if pending_count == 0:
        status = "returned"
        actual_return = returned_at
    elif pending_count < len(items):
        status = "partial"
        actual_return = None
    else:
        status = "pending"
        actual_return = None

    await db.transactions.update_one(
        {"id": txn["id"]},
        {"$set": {"items": items, "status": status, "actual_return_date": actual_return}},
    )
    txn["items"] = items
    txn["status"] = status
    txn["actual_return_date"] = actual_return
    return txn


# --- Dashboard ---
@api.get("/dashboard/stats")
async def dashboard_stats(user=Depends(get_current_user)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    total_catalogues = await db.catalogues.count_documents({})
    agg = await db.catalogues.aggregate([
        {"$group": {"_id": None, "available": {"$sum": "$available_quantity"}, "issued": {"$sum": "$issued_quantity"}, "total": {"$sum": "$total_quantity"}}}
    ]).to_list(1)
    sums = agg[0] if agg else {"available": 0, "issued": 0, "total": 0}

    total_customers = await db.customers.count_documents({})
    pending_txn = await db.transactions.count_documents({"status": {"$in": ["pending", "partial"]}})

    # Returned today (count items returned today)
    today_returns = await db.transactions.aggregate([
        {"$unwind": "$items"},
        {"$match": {"items.returned_at": {"$gte": today_start}}},
        {"$count": "n"},
    ]).to_list(1)
    returned_today = today_returns[0]["n"] if today_returns else 0

    # Overdue
    now_str = now_iso()
    overdue = await db.transactions.count_documents({
        "status": {"$in": ["pending", "partial"]},
        "expected_return_date": {"$lt": now_str},
    })

    recent = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).limit(8).to_list(8)

    return {
        "total_catalogues_available": int(sums.get("available", 0)),
        "total_catalogues_issued": int(sums.get("issued", 0)),
        "total_catalogue_items": int(total_catalogues),
        "returned_today": int(returned_today),
        "pending_returns": int(pending_txn),
        "total_customers": int(total_customers),
        "overdue_returns": int(overdue),
        "recent_transactions": recent,
    }


@api.get("/dashboard/charts")
async def dashboard_charts(user=Depends(get_current_user)):
    # 7-day trends
    days = []
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        days.append(d)

    issue_trend = []
    return_trend = []
    for d in days:
        start = d.isoformat()
        end = (d + timedelta(days=1)).isoformat()
        issued_agg = await db.transactions.aggregate([
            {"$match": {"issue_date": {"$gte": start, "$lt": end}}},
            {"$unwind": "$items"},
            {"$group": {"_id": None, "n": {"$sum": "$items.quantity"}}},
        ]).to_list(1)
        ret_agg = await db.transactions.aggregate([
            {"$unwind": "$items"},
            {"$match": {"items.returned_at": {"$gte": start, "$lt": end}}},
            {"$group": {"_id": None, "n": {"$sum": "$items.quantity"}}},
        ]).to_list(1)
        label = d.strftime("%b %d")
        issue_trend.append({"date": label, "count": int(issued_agg[0]["n"]) if issued_agg else 0})
        return_trend.append({"date": label, "count": int(ret_agg[0]["n"]) if ret_agg else 0})

    most_borrowed = await db.transactions.aggregate([
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.catalogue_name", "count": {"$sum": "$items.quantity"}}},
        {"$sort": {"count": -1}},
        {"$limit": 6},
    ]).to_list(6)
    most_borrowed = [{"name": m["_id"], "count": int(m["count"])} for m in most_borrowed if m["_id"]]

    return {"issue_trend": issue_trend, "return_trend": return_trend, "most_borrowed": most_borrowed}


@api.get("/search")
async def global_search(q: str, user=Depends(get_current_user)):
    rx = {"$regex": q, "$options": "i"}
    customers = await db.customers.find({"$or": [{"name": rx}, {"mobile": rx}]}, {"_id": 0}).limit(5).to_list(5)
    catalogues = await db.catalogues.find({"name": rx}, {"_id": 0}).limit(5).to_list(5)
    transactions = await db.transactions.find(
        {"$or": [{"customer_name": rx}, {"transaction_id": rx}, {"items.catalogue_name": rx}]},
        {"_id": 0},
    ).limit(5).to_list(5)
    return {"customers": customers, "catalogues": catalogues, "transactions": transactions}


# Register router
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("username", unique=True)
    await db.catalogues.create_index("name")
    await db.customers.create_index("name")
    await db.customers.create_index("mobile")
    await db.transactions.create_index("customer_name")
    await db.transactions.create_index("transaction_id", unique=True)

    # Seed admin
    existing = await db.users.find_one({"username": ADMIN_USERNAME})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "username": ADMIN_USERNAME,
            "password_hash": hash_pw(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info(f"Seeded admin user: {ADMIN_USERNAME}")
    else:
        if not verify_pw(ADMIN_PASSWORD, existing["password_hash"]):
            await db.users.update_one(
                {"username": ADMIN_USERNAME},
                {"$set": {"password_hash": hash_pw(ADMIN_PASSWORD)}},
            )
            logger.info("Updated admin password")


@app.on_event("shutdown")
async def shutdown():
    client.close()
