# Soochi

Soochi helps tailors and makers reuse fabric scraps. The React/Vite frontend
uses the FastAPI backend for authentication, scrap analysis and storage,
products, matching, nearby listings, and requests.

Exact coordinates are never shown to other users. Listings expose an area name
and approximate distance.

## Run the app

Start the backend in one terminal from the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

Start the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173/`. Vite proxies
`/api` calls to `http://localhost:8000`. For a separately hosted API, set
`VITE_API_URL` in `frontend/.env` to its base URL.

Create an account from the signup page (passwords must be at least 8
characters), then log in with that account. Existing demo-browser data is not
imported into the SQLite database.

### What to try

1. **Inventory:** search and filter scraps.
2. **Add scrap:** upload a photo, run the backend analysis, review and save detected scraps.
3. **Make things · Mode A:** select scraps and request catalogue product matches from FastAPI.
4. **Make things · Mode B:** enter a product size and request scrap matches from FastAPI.
5. **Near me:** request a listing (area and distance only).
6. **Requests:** approve or decline incoming asks; owner contact appears after approval.

Matching endpoints currently return backend mock suggestions. Accounts, scraps,
nearby listings, and requests are stored in SQLite.

The API runs at `http://localhost:8000`; interactive docs are at
`http://localhost:8000/docs`. SQLite creates `soochi.db` in the working
directory. Set `SOOCHI_DATABASE_URL` to use another database path and
`SOOCHI_SECRET_KEY` to a private random value before deployment. CORS allows
`http://localhost:5173`.

Except for signup and login, API routes require
`Authorization: Bearer <token>`. Use the token returned by either auth route.

## API examples

### Health: `GET /health`

```bash
curl http://localhost:8000/health
```

### Sign up: `POST /auth/signup`

```bash
curl -X POST http://localhost:8000/auth/signup -H 'Content-Type: application/json' \
  -d '{"name":"Asha","contact":"asha@example.com","password":"fabric123","lat":12.9716,"lng":77.5946,"area_name":"Indiranagar"}'
```

### Log in: `POST /auth/login`

```bash
curl -X POST http://localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"contact":"asha@example.com","password":"fabric123"}'
```

### Analyze a scrap: `POST /scraps/analyze`

```bash
curl -X POST http://localhost:8000/scraps/analyze -H 'Authorization: Bearer TOKEN' \
  -F 'image=@fabric.jpg'
```

### Save scraps: `POST /scraps`

The request body is a JSON array:

```bash
curl -X POST http://localhost:8000/scraps -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '[{"temp_id":"scrap-1","width_cm":32,"height_cm":24,"color_hex":"#4F7C70","crop_url":"/media/crop.png","tags":{"fabric_type":"cotton","stretch":"none","weight":"medium","pattern":"solid","dominant_color":"sage green","defects":[]}}]'
```

### List my scraps: `GET /scraps/mine`

```bash
curl http://localhost:8000/scraps/mine -H 'Authorization: Bearer TOKEN'
```

### List products: `GET /products`

```bash
curl http://localhost:8000/products -H 'Authorization: Bearer TOKEN'
```

### Nearby listings: `GET /nearby`

```bash
curl http://localhost:8000/nearby -H 'Authorization: Bearer TOKEN'
```

### Match scraps to products: `POST /match/scraps-to-products`

```bash
curl -X POST http://localhost:8000/match/scraps-to-products -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' -d '{"scrap_ids":[1]}'
```

### Match a product to scraps: `POST /match/product-to-scraps`

```bash
curl -X POST http://localhost:8000/match/product-to-scraps -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' -d '{"product_id":2}'
```

Or send a custom product: `{"custom":{"name":"Table runner","width_cm":30,"height_cm":90}}`.

### Create a request: `POST /requests`

```bash
curl -X POST http://localhost:8000/requests -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' -d '{"scrap_id":2}'
```

### Incoming requests: `GET /requests/incoming`

```bash
curl http://localhost:8000/requests/incoming -H 'Authorization: Bearer TOKEN'
```

### Outgoing requests: `GET /requests/outgoing`

```bash
curl http://localhost:8000/requests/outgoing -H 'Authorization: Bearer TOKEN'
```

### Respond to a request: `POST /requests/{id}/respond`

```bash
curl -X POST http://localhost:8000/requests/1/respond -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' -d '{"action":"approve"}'
```

## Checks

```bash
cd frontend
npm run lint
npm run build
```

The backend API exposes OpenAPI docs at `/docs` when running. Location in
nearby and request responses is area-level only; owner contact is revealed to
requesters only after approval.

## Public deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Render Blueprint, persistent data
configuration, AI endpoint setup, and deployment checks.
