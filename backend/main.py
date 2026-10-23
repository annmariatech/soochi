"""Soochi API: persistent accounts/scraps/requests with fast-start mock analysis."""

from pathlib import Path
from math import atan2, cos, radians, sin, sqrt
from uuid import uuid4

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from .ai.vlm import tag_scrap
from .auth import create_access_token, get_current_user, hash_password, verify_password
from .database import Base, engine, get_db
from .models import ReuseRequest, Scrap, User
from .schemas import AuthOut, ProductMatchInput, ProductOut, RequestCreate, RequestRespond, ScrapInput, ScrapOut, UserLogin, UserSignup
from vision.detect import detect_scraps

Base.metadata.create_all(bind=engine)

# create_all does not add columns to an existing SQLite database.
if "scraps" in inspect(engine).get_table_names() and "name" not in {
    column["name"] for column in inspect(engine).get_columns("scraps")
}:
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE scraps ADD COLUMN name VARCHAR(160) NOT NULL DEFAULT 'Fabric scrap'"))

MEDIA_DIR = Path(__file__).resolve().parents[1] / "data" / "generated_media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Soochi API", version="0.1.0")
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MOCK_PRODUCTS = [
    {"id": 1, "name": "Patchwork Tote Bag", "size_label": "Medium", "pieces": [{"w_cm": 35, "h_cm": 40, "qty": 2}, {"w_cm": 10, "h_cm": 25, "qty": 2}], "fabric_notes": "Medium-weight cotton or canvas works well."},
    {"id": 2, "name": "Zip Pouch", "size_label": "Small", "pieces": [{"w_cm": 22, "h_cm": 16, "qty": 2}], "fabric_notes": "A stable woven fabric is easiest to sew."},
    {"id": 3, "name": "Cushion Cover", "size_label": "40 × 40 cm", "pieces": [{"w_cm": 42, "h_cm": 42, "qty": 2}], "fabric_notes": "Use two matching pieces of woven fabric."},
]
MOCK_SOURCES = [
    {"id": "snippet-cotton", "text": "Stable woven cotton is suitable for reusable bags and small pouches."},
    {"id": "snippet-lining", "text": "Add a lining when the outer fabric is lightweight or loosely woven."},
]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/signup", response_model=AuthOut, status_code=status.HTTP_201_CREATED)
def signup(payload: UserSignup, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.contact == payload.contact)):
        raise HTTPException(status_code=409, detail="Contact is already registered")
    user = User(name=payload.name, contact=payload.contact, password_hash=hash_password(payload.password), lat=payload.lat, lng=payload.lng, area_name=payload.area_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_access_token(user.id), "user": user}


@app.post("/auth/login", response_model=AuthOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.contact == payload.contact))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect contact or password", headers={"WWW-Authenticate": "Bearer"})
    return {"token": create_access_token(user.id), "user": user}


@app.post("/scraps/analyze")
async def analyze_scrap(image: UploadFile = File(...), _user: User = Depends(get_current_user)):
    image_bytes = await image.read()
    detected = detect_scraps(image_bytes)
    if not detected["success"]:
        raise HTTPException(status_code=422, detail=detected["error"] or "Could not analyze image")

    analysis_id = uuid4().hex[:12]
    analysis_dir = MEDIA_DIR / analysis_id
    analysis_dir.mkdir(parents=True, exist_ok=True)
    annotated_path = analysis_dir / "annotated.png"
    annotated_path.write_bytes(detected["annotated_image_png"])

    result_scraps = []
    for scrap in detected["scraps"]:
        crop_path = analysis_dir / f"{scrap['temp_id']}.png"
        crop_path.write_bytes(scrap["crop_png"])
        tags = tag_scrap(str(crop_path)).model_dump()
        result_scraps.append({
            "temp_id": scrap["temp_id"],
            "width_cm": scrap["width_cm"],
            "height_cm": scrap["height_cm"],
            "dimensions_label": f"{scrap['width_cm']:.1f} × {scrap['height_cm']:.1f} cm",
            "color_hex": scrap["color_hex"],
            "polygon": scrap["polygon"],
            "crop_url": f"/media/{analysis_id}/{crop_path.name}",
            "tags": tags,
        })

    return {"annotated_image_url": f"/media/{analysis_id}/annotated.png", "scraps": result_scraps}


@app.post("/scraps", response_model=list[ScrapOut], status_code=status.HTTP_201_CREATED)
def save_scraps(scraps: list[ScrapInput], db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    saved = [Scrap(owner_id=user.id, **scrap.model_dump()) for scrap in scraps]
    db.add_all(saved)
    db.commit()
    for scrap in saved:
        db.refresh(scrap)
    return saved


@app.get("/scraps/mine", response_model=list[ScrapOut])
def my_scraps(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return list(db.scalars(select(Scrap).where(Scrap.owner_id == user.id).order_by(Scrap.id)))


@app.get("/products", response_model=list[ProductOut])
def products(_user: User = Depends(get_current_user)):
    return MOCK_PRODUCTS


@app.get("/nearby")
def nearby_scraps(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    listings = []
    for scrap in db.scalars(select(Scrap).where(Scrap.owner_id != user.id)):
        owner = db.get(User, scrap.owner_id)
        if owner is None:
            continue
        lat1, lat2 = radians(user.lat), radians(owner.lat)
        dlat, dlng = lat2 - lat1, radians(owner.lng - user.lng)
        haversine = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
        distance = 6371 * 2 * atan2(sqrt(haversine), sqrt(1 - haversine))
        listings.append({
            "scrap": {
                "id": scrap.id, "owner_id": scrap.owner_id, "temp_id": scrap.temp_id,
                "name": scrap.name, "width_cm": scrap.width_cm, "height_cm": scrap.height_cm,
                "color_hex": scrap.color_hex, "crop_url": scrap.crop_url, "tags": scrap.tags,
            },
            "owner_name": owner.name,
            "owner_area": owner.area_name,
            "distance_km": round(distance, 1),
        })
    return sorted(listings, key=lambda listing: listing["distance_km"])


@app.post("/match/scraps-to-products")
def match_scraps_to_products(_payload: dict, _user: User = Depends(get_current_user)):
    return [
        {"product_id": 2, "name": "Zip Pouch", "size_label": "Small", "utilization_pct": 78, "verdict": {"suitable": True, "reason": "The selected scraps cover the pouch panels with room for seam allowance."}, "sources": MOCK_SOURCES[:1]},
        {"product_id": 1, "name": "Patchwork Tote Bag", "size_label": "Medium", "utilization_pct": 46, "verdict": {"suitable": False, "reason": "More fabric is needed for the tote body and straps."}, "sources": MOCK_SOURCES},
    ]


@app.post("/match/product-to-scraps")
def match_product_to_scraps(payload: ProductMatchInput, _user: User = Depends(get_current_user)):
    if payload.product_id is None and payload.custom is None:
        raise HTTPException(status_code=422, detail="Provide product_id or custom")
    product = next((p for p in MOCK_PRODUCTS if p["id"] == payload.product_id), None)
    if payload.product_id is not None and product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    label = payload.custom.name if payload.custom else product["name"]
    return {
        "matches": [{"scrap": {"id": 1, "width_cm": 32.0, "height_cm": 24.0, "color_hex": "#4F7C70", "tags": {"fabric_type": "cotton", "weight": "medium"}}, "utilization_pct": 78, "verdict": {"suitable": True, "reason": f"This scrap can make part of the {label}."}, "sources": MOCK_SOURCES[:1]}],
        "shortage": {"missing_width_cm": 10.0, "missing_height_cm": 16.0},
        "nearby": [{"scrap": {"id": 204, "width_cm": 28.0, "height_cm": 22.0, "color_hex": "#B45D62", "tags": {"fabric_type": "cotton", "weight": "medium"}}, "owner_area": "Indiranagar", "distance_km": 2.4}],
    }


def _request_view(request: ReuseRequest, db: Session, incoming: bool):
    scrap = db.get(Scrap, request.scrap_id)
    owner = db.get(User, scrap.owner_id) if scrap else None
    requester = db.get(User, request.requester_id)
    result = {
        "id": request.id, "scrap_id": request.scrap_id, "requester_id": request.requester_id,
        "status": request.status, "created_at": request.created_at.isoformat(),
        "scrap": {"id": scrap.id, "name": scrap.name, "width_cm": scrap.width_cm, "height_cm": scrap.height_cm, "color_hex": scrap.color_hex, "crop_url": scrap.crop_url, "tags": scrap.tags} if scrap else None,
    }
    if incoming:
        result["requester"] = {"id": requester.id, "name": requester.name, "area_name": requester.area_name} if requester else None
    else:
        result["owner_name"] = owner.name if owner else None
        result["owner_area"] = owner.area_name if owner else None
        if request.status == "approved" and owner:
            result["owner_contact"] = owner.contact
    return result


@app.post("/requests", status_code=status.HTTP_201_CREATED)
def create_request(payload: RequestCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    scrap = db.get(Scrap, payload.scrap_id)
    if scrap is None:
        raise HTTPException(status_code=404, detail="Scrap not found")
    if scrap.owner_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot request your own scrap")
    duplicate = db.scalar(select(ReuseRequest).where(ReuseRequest.scrap_id == scrap.id, ReuseRequest.requester_id == user.id, ReuseRequest.status == "pending"))
    if duplicate:
        raise HTTPException(status_code=409, detail="A pending request already exists")
    request = ReuseRequest(scrap_id=scrap.id, requester_id=user.id)
    db.add(request)
    db.commit()
    db.refresh(request)
    return _request_view(request, db, incoming=False)


@app.get("/requests/incoming")
def incoming_requests(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.scalars(select(ReuseRequest).join(Scrap).where(Scrap.owner_id == user.id).order_by(ReuseRequest.id.desc()))
    return [_request_view(row, db, incoming=True) for row in rows]


@app.get("/requests/outgoing")
def outgoing_requests(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.scalars(select(ReuseRequest).where(ReuseRequest.requester_id == user.id).order_by(ReuseRequest.id.desc()))
    return [_request_view(row, db, incoming=False) for row in rows]


@app.post("/requests/{request_id}/respond")
def respond_to_request(request_id: int, payload: RequestRespond, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    request = db.get(ReuseRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Request not found")
    scrap = db.get(Scrap, request.scrap_id)
    if scrap is None or scrap.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the scrap owner can respond")
    if request.status != "pending":
        raise HTTPException(status_code=409, detail="Request has already been answered")
    request.status = "approved" if payload.action == "approve" else "declined"
    db.commit()
    db.refresh(request)
    return _request_view(request, db, incoming=True)
