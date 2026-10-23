# Soochi

FastAPI backend skeleton for the Soochi fabric-scrap reuse app. Signup, login,
scrap storage and reuse requests use SQLite. Scrap analysis and matching return
contract-shaped mock data so frontend work can start before AI integration.

## Run locally

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

The API is at `http://localhost:8000`; interactive OpenAPI docs are at
`http://localhost:8000/docs`. SQLite creates `soochi.db` in the working
directory on first run. Set `SOOCHI_DATABASE_URL` to use another SQLite path
and set `SOOCHI_SECRET_KEY` to a private random value before deployment. CORS
allows `http://localhost:5173`.

All routes except signup and login require `Authorization: Bearer <token>`.
Use the token returned by signup/login in the examples below. These commands
assume the API is running and a user is signed up; replace `TOKEN` and IDs as
needed.

## API examples

### `GET /health`

```bash
curl http://localhost:8000/health
```

### `POST /auth/signup`

```bash
curl -X POST http://localhost:8000/auth/signup -H 'Content-Type: application/json' \
  -d '{"name":"Asha","contact":"asha@example.com","password":"fabric123","lat":12.9716,"lng":77.5946,"area_name":"Indiranagar"}'
```

### `POST /auth/login`

```bash
curl -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"contact":"asha@example.com","password":"fabric123"}'
```

### `POST /scraps/analyze`

```bash
curl -X POST http://localhost:8000/scraps/analyze -H 'Authorization: Bearer TOKEN' \
  -F 'image=@fabric.jpg'
```

### `POST /scraps`

The request body is a JSON array, matching the contract.

```bash
curl -X POST http://localhost:8000/scraps -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '[{"temp_id":"scrap-1","width_cm":32,"height_cm":24,"color_hex":"#4F7C70","crop_url":"/mock-media/crop-1.jpg","tags":{"fabric_type":"cotton","stretch":"none","weight":"medium","pattern":"solid","dominant_color":"sage green","defects":[]}}]'
```

### `GET /scraps/mine`

```bash
curl http://localhost:8000/scraps/mine -H 'Authorization: Bearer TOKEN'
```

### `GET /products`

```bash
curl http://localhost:8000/products -H 'Authorization: Bearer TOKEN'
```

### `POST /match/scraps-to-products`

```bash
curl -X POST http://localhost:8000/match/scraps-to-products -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' -d '{"scrap_ids":[1]}'
```

### `POST /match/product-to-scraps`

```bash
curl -X POST http://localhost:8000/match/product-to-scraps -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' -d '{"product_id":2}'
```

Or pass a custom product: `{"custom":{"name":"Table runner","width_cm":30,"height_cm":90}}`.

### `POST /requests`

```bash
curl -X POST http://localhost:8000/requests -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' -d '{"scrap_id":2}'
```

### `GET /requests/incoming`

```bash
curl http://localhost:8000/requests/incoming -H 'Authorization: Bearer TOKEN'
```

### `GET /requests/outgoing`

```bash
curl http://localhost:8000/requests/outgoing -H 'Authorization: Bearer TOKEN'
```

### `POST /requests/{id}/respond`

```bash
curl -X POST http://localhost:8000/requests/1/respond -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' -d '{"action":"approve"}'
```

Location in nearby and request responses is area-level only. The owner's
contact appears in an outgoing request only after that request is approved.
