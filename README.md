# Soochi

Soochi helps makers give leftover fabric a second life. Add a photo of fabric
with an A4 sheet for scale, review the detected scraps and dimensions, save
them to your inventory, and explore projects or nearby listings. Users can
manage their profiles, save favourite scraps, send reuse requests, and choose
light or dark appearance.

This repository contains a React/Vite web app and a FastAPI service. The API
stores accounts, scraps, favourites, and reuse requests in a database. Photo
analysis combines computer vision for fabric regions and measurements with
Ollama for fabric tags. Product and matching suggestions are currently partly
mocked; see [Current behavior](#current-behavior-and-limitations).

## Contents

- [Features](#features)
- [Project layout](#project-layout)
- [Requirements](#requirements)
- [Run locally](#run-locally)
- [Database and accounts](#database-and-accounts)
- [Ollama and AI](#ollama-and-ai)
- [API reference](#api-reference)
- [Configuration](#configuration)
- [Build and checks](#build-and-checks)
- [Deployment](#deployment)
- [Current behavior and limitations](#current-behavior-and-limitations)

## Features

- Email or phone signup and login using bearer JWTs.
- Scrap inventory with search, type filters, dimensions, color, and fabric
  details.
- Photo upload or camera capture. The backend detects fabric regions relative
  to an A4 reference sheet, estimates dimensions, and returns image crops.
- Ollama vision tagging for fabric type, stretch, weight, pattern, color, and
  visible defects. Safe labels are returned if Ollama is unavailable.
- Scrap deletion, including cleanup of related favourites and reuse requests.
- Favourites displayed in the Profile page.
- Product matching, nearby scrap listings, and reuse requests.
- Persistent light/dark appearance preference.
- Approximate neighborhood and distance display. Exact user coordinates are
  not included in nearby listing responses.

<img width="1280" height="780" alt="ss3" src="https://github.com/user-attachments/assets/d318d5d7-0b95-4c51-9fb1-2e50bb701883" />

<img width="1280" height="752" alt="ss4" src="https://github.com/user-attachments/assets/698f260e-088b-4b0c-8e9d-7dca8ddcdab7" />


<img width="1280" height="640" alt="SS" src="https://github.com/user-attachments/assets/acca0a0f-1706-48bd-aa84-85d55052e422" />


## Project layout

```text
backend/
  ai/                 Ollama client, vision tagging, RAG and local gateway
  auth.py             Password hashing and JWT creation/validation
  database.py         SQLAlchemy engine and database sessions
  main.py             FastAPI app and API routes
  models.py           SQLAlchemy models
  schemas.py          Pydantic request and response schemas
  requirements.txt    Python dependencies
data/
  kb_snippets.json    Fabric guidance snippets used by the RAG module
  products.json       Product seed data
  test_photos/        Sample images for local vision experiments
docs/
  CONTEXT.md          Project context and API design notes
  demo_script.md      Demo walkthrough
frontend/
  src/api.js          Frontend API client
  src/pages/          React pages
  src/components/     Shared layout, map and scrap card components
  vite.config.js      Local API and media proxy
vision/
  detect.py           Fabric segmentation, calibration and measurements
render.yaml           Render Blueprint for the API, frontend and database
DEPLOYMENT.md         Render deployment and Ollama tunnel instructions
```

## Requirements

- Python 3.12 or newer.
- Node.js and npm (use a version compatible with the Vite version in
  `frontend/package-lock.json`).
- Ollama for real AI fabric tags. The rest of the app can run without Ollama;
  tagging then falls back to safe defaults.
- For production hosting, a database and a reachable Ollama endpoint if AI
  tagging is required.

## Run locally

Run commands from the repository root unless noted.

### 1. Install backend dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```

On Windows PowerShell, activate the environment with
`.venv\Scripts\Activate.ps1`.

### 2. Start FastAPI

```bash
source .venv/bin/activate
uvicorn backend.main:app --reload
```

The API listens at `http://localhost:8000`. Open
[`http://localhost:8000/docs`](http://localhost:8000/docs) for interactive
OpenAPI documentation and [`http://localhost:8000/health`](http://localhost:8000/health)
for the health check.

### 3. Install and start the frontend

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite, usually
[`http://localhost:5173`](http://localhost:5173). During local development,
Vite proxies `/api/*` to FastAPI on port `8000`, and `/media/*` to the same
backend. Leave `VITE_API_URL` unset for this local proxy behavior.

### 4. Create an account

Sign up in the app with your name, a unique email or phone contact, a password
of at least 8 characters, and a neighborhood. The backend issues a JWT that
the frontend stores in browser local storage. Tokens expire after 7 days; log
in again if an authenticated request reports an invalid or expired token.

The local default database is `soochi.db` in the repository root. Local
accounts are separate from accounts in a deployed database.

## Database and accounts

SQLAlchemy creates the database tables at API startup. The database contains:

| Table | Purpose |
| --- | --- |
| `users` | Account details, password hashes, and approximate-location source coordinates |
| `scraps` | A user's saved fabric pieces, dimensions, photos, and AI tags |
| `products` | Product catalog records |
| `requests` | Requests to reuse another maker's scrap |
| `favorites` | User-to-scrap favourite relationships |

Passwords are hashed with bcrypt. Authenticated routes require:

```http
Authorization: Bearer <JWT returned by signup or login>
```

Deleting a scrap is restricted to its owner. The API also removes favourite
and reuse-request rows linked to that scrap. Reuse requests reveal an owner's
contact only after the owner approves the request.

Photo crops and annotated images are written beneath
`data/generated_media/` by default. Set `SOOCHI_MEDIA_DIR` to change this
directory. On hosts with an ephemeral filesystem, images may disappear on
restart or redeploy even when database records persist.

## Ollama and AI

Install and start Ollama, then fetch the models used by the app:

```bash
ollama pull gemma3:4b
ollama pull nomic-embed-text
```

Ollama normally listens locally at `http://localhost:11434`. If
`OLLAMA_HOST` is unset, the Python Ollama client uses its local default. The
VLM call uses `gemma3:4b` to tag each detected scrap. On failure, it logs the
error and returns safe defaults (`other`, `none`, `medium`, `solid`, and
`unknown`).

To check Ollama models locally:

```bash
ollama list
curl http://localhost:11434/api/tags
```

To run the image-tagging helper on a folder of images:

```bash
source .venv/bin/activate
python -m backend.ai.tag_folder data/test_photos
```

### Optional fabric-guidance RAG index

`backend/ai/rag.py` reads `data/kb_snippets.json`. It expects a JSON array of
objects with `id`, `topic`, and `text` fields; supported topic names in the
provided knowledge base are `tote`, `pouch`, `scrunchie`, and `general`.
Embeddings use `nomic-embed-text`, and the persistent Chroma collection is
named `fabric_kb`.

Build or refresh the index while Ollama and `nomic-embed-text` are available:

```bash
source .venv/bin/activate
python -c 'from backend.ai.rag import build_index; print(build_index())'
```

The index is stored under `data/chroma` by default. Override its path with
`SOOCHI_CHROMA_PATH`; override the snippets file with `SOOCHI_KB_PATH`.

### Use a Mac-hosted Ollama instance from Render

Render cannot use the Ollama process on your laptop through `localhost`. A
reachable tunnel and the token-protected gateway are required. **Do not expose
Ollama's port `11434` directly.** The gateway listens on `127.0.0.1:11435`,
authenticates a bearer token, and forwards only allowed Ollama endpoints.

Use the detailed walkthrough in [DEPLOYMENT.md](DEPLOYMENT.md#connect-render-to-ollama-on-your-mac-through-cloudflare-tunnel).
For a temporary Cloudflare Quick Tunnel, keep Ollama, the gateway, the tunnel,
the laptop, and its network connection running. The generated hostname changes
when the Quick Tunnel restarts. Set `OLLAMA_HOST` and `OLLAMA_PROXY_TOKEN` on
the Render **API service only**; never expose the token in a `VITE_` frontend
variable.

## API reference

The full, interactive schema is available at `/docs`. All routes below require
a bearer token except `GET /health`, `POST /auth/signup`, and
`POST /auth/login`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/auth/signup` | Create an account and return a token |
| `POST` | `/auth/login` | Authenticate and return a token |
| `GET` | `/users/me` | Read the signed-in user's profile |
| `PATCH` | `/users/me` | Update name or neighborhood |
| `POST` | `/scraps/analyze` | Upload a photo and return detected scraps, crops, measurements, and tags |
| `POST` | `/scraps` | Save a JSON array of reviewed scraps |
| `GET` | `/scraps/mine` | List the signed-in user's scraps |
| `DELETE` | `/scraps/{scrap_id}` | Delete an owned scrap and linked requests/favourites |
| `GET` | `/products` | List catalog products |
| `GET` | `/nearby` | List other users' scraps with neighborhood-level location |
| `POST` | `/match/scraps-to-products` | Match selected scrap IDs to products |
| `POST` | `/match/product-to-scraps` | Find scraps for a catalog or custom product |
| `GET` | `/favourites` | List the user's favourite scraps |
| `POST` | `/favourites/{scrap_id}` | Add a scrap to favourites |
| `DELETE` | `/favourites/{scrap_id}` | Remove a scrap from favourites |
| `POST` | `/requests` | Request to reuse another user's scrap |
| `GET` | `/requests/incoming` | List requests on the user's scraps |
| `GET` | `/requests/outgoing` | List requests the user sent |
| `POST` | `/requests/{request_id}/respond` | Approve or decline an incoming request |

### Example: sign up and capture a token

```bash
API_URL=http://localhost:8000
curl -sS -X POST "$API_URL/auth/signup" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Asha","contact":"asha@example.com","password":"fabric123","lat":12.9716,"lng":77.5946,"area_name":"Indiranagar"}'
```

The response includes a `token`. Copy it into a local shell variable for the
remaining examples (replace the placeholder with the returned value):

```bash
API_TOKEN='paste-the-returned-JWT-here'
```

### Example: log in

```bash
curl -sS -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"contact":"asha@example.com","password":"fabric123"}'
```

### Example: update profile

```bash
curl -sS -X PATCH "$API_URL/users/me" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Asha","area_name":"Indiranagar"}'
```

### Example: analyze and save a scrap

Analysis uses multipart form data. Put a ruler or A4 sheet beside the fabric
for scale, and send the original image file:

```bash
curl -sS -X POST "$API_URL/scraps/analyze" \
  -H "Authorization: Bearer $API_TOKEN" \
  -F 'image=@data/test_photos/fabric 1.jpeg'
```

The response contains an `annotated_image_url` and a `scraps` array. Review
the dimensions and tags before saving. Example save request:

```bash
curl -sS -X POST "$API_URL/scraps" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '[{"temp_id":"scrap-1","name":"Blue cotton piece","width_cm":32,"height_cm":24,"area_cm2":768,"shape_type":"rectangle","radius_cm":null,"color_hex":"#4F7C70","crop_url":"/media/example/scrap_1.png","tags":{"fabric_type":"cotton","stretch":"none","weight":"medium","pattern":"solid","dominant_color":"sage green","defects":[]}}]'
```

### Example: list and delete a scrap

```bash
curl -sS "$API_URL/scraps/mine" \
  -H "Authorization: Bearer $API_TOKEN"

curl -i -X DELETE "$API_URL/scraps/1" \
  -H "Authorization: Bearer $API_TOKEN"
```

Successful deletion returns `204 No Content`. Users can delete only their own
scraps.

### Example: favourites

```bash
curl -sS "$API_URL/favourites" \
  -H "Authorization: Bearer $API_TOKEN"

curl -i -X POST "$API_URL/favourites/2" \
  -H "Authorization: Bearer $API_TOKEN"

curl -i -X DELETE "$API_URL/favourites/2" \
  -H "Authorization: Bearer $API_TOKEN"
```

### Example: matching and nearby listings

Match saved scrap IDs against the catalog:

```bash
curl -sS -X POST "$API_URL/match/scraps-to-products" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"scrap_ids":[1,2]}'
```

Match a catalog product against available scraps:

```bash
curl -sS -X POST "$API_URL/match/product-to-scraps" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"product_id":2}'
```

The custom product form is `{"custom":{"name":"Table runner","width_cm":30,"height_cm":90}}`.
For nearby listings, call `GET /nearby` with the bearer token.

### Example: requests

```bash
curl -sS -X POST "$API_URL/requests" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"scrap_id":2}'

curl -sS "$API_URL/requests/incoming" \
  -H "Authorization: Bearer $API_TOKEN"

curl -sS "$API_URL/requests/outgoing" \
  -H "Authorization: Bearer $API_TOKEN"

curl -sS -X POST "$API_URL/requests/1/respond" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"action":"approve"}'
```

The response action is either `approve` or `decline`. The owner contact is
returned to the requester only after approval.

## Configuration

| Variable | Default / use |
| --- | --- |
| `SOOCHI_DATABASE_URL` | Optional database URL; takes precedence over `DATABASE_URL` |
| `DATABASE_URL` | Local fallback is `sqlite:///./soochi.db`; Render injects its Postgres URL |
| `SOOCHI_SECRET_KEY` | JWT signing key; required in production |
| `SOOCHI_ENV` | Set to `production` on deployment to require `SOOCHI_SECRET_KEY` |
| `SOOCHI_CORS_ORIGINS` | Comma-separated allowed frontend origins; local default is `http://localhost:5173` |
| `SOOCHI_MEDIA_DIR` | Upload/crop storage directory; default is `data/generated_media` |
| `VITE_API_URL` | Frontend API base URL; local default behavior uses Vite's `/api` proxy |
| `OLLAMA_HOST` | Ollama URL; local Ollama default is used when unset |
| `OLLAMA_PROXY_TOKEN` | Optional shared bearer token for the protected Ollama gateway |
| `SOOCHI_KB_PATH` | Optional path to `kb_snippets.json` |
| `SOOCHI_CHROMA_PATH` | Chroma persistence directory; default is `data/chroma` |

Do not commit secrets or place `OLLAMA_PROXY_TOKEN` in a `VITE_` variable.
Changing `SOOCHI_SECRET_KEY` invalidates previously issued login tokens, so
users will have to sign in again.

## Build and checks

Frontend production build:

```bash
cd frontend
npm ci
npm run build
```

Frontend lint:

```bash
cd frontend
npm run lint
```

The FastAPI app's OpenAPI schema and interactive API docs are available at
`/openapi.json` and `/docs` while the backend is running.

## Deployment

The root `render.yaml` Blueprint defines the FastAPI API, static frontend, and
PostgreSQL database; all are configured to deploy from `main`. In Render,
create a new Blueprint, connect this repository, select `main`, review the
planned resources and tiers, and apply it. For exact setup steps, current free
service limits, and the Mac-hosted Ollama tunnel, see [DEPLOYMENT.md](DEPLOYMENT.md).

The app can be run as a demo on free resources, but free databases may expire
and web filesystems may be ephemeral. For lasting public use, configure
durable database backups and persistent or object storage for uploaded images.

## Current behavior and limitations

- Segmentation and physical measurements are computer-vision estimates. Image
  quality, visible reference-sheet edges, camera angle, and lighting affect
  accuracy. Review or edit dimensions before saving.
- VLM fabric labels depend on the configured Ollama model. If the model or
  tunnel is unavailable, the backend deliberately returns safe defaults and
  records an error in the API logs.
- Product catalog records and some matching responses are mock/demo data.
  Combined scrap area helps screen products, but area alone does not guarantee
  that pattern pieces can be laid out without overlap or around defects.
- The Chroma RAG module can be built and queried independently. The current
  product-matching API does not call it for every recommendation.
- Nearby map markers use approximate, rounded coordinates derived from a
  user's saved location; they are not exact addresses.
- On Render free resources, the API may sleep when idle, the database has
  plan-specific limits/expiry, and uploaded photos may not survive restarts.
  Review Render's current terms before relying on the free setup.
