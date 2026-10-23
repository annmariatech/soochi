# Soochi

Soochi is a fabric-scrap reuse app for tailors and makers. This repository currently ships a **frontend-only demo**: inventory, simulated scanning, product matching, nearby listings, and sharing requests all run in the browser with mock data.

Exact coordinates are never shown to other users. Listings only include an area name and an approximate distance.

## Run the demo

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/`).

No backend, API keys, or `.env` file are required.

## Demo login

- Contact: `9876543210`
- Name: Haaniah
- Area: Kalamassery

That account already has four scraps (Rosie, Olive, Sunny, Cloudy), an incoming request from Meera, and an approved outgoing request for Leela’s cream silk.

Sign up with any other 10-digit number to start with an empty basket.

## What to try

1. **Inventory** — search and filter your scraps.
2. **Add scrap** — upload any photo, run the simulated scan, edit attributes, then save. Saved pieces appear in Inventory.
3. **Make things · Mode A** — select scraps and see which catalogue products fit, with utilization %.
4. **Make things · Mode B** — enter a product size. If your basket is short, nearby mock scraps that fill the gap are listed.
5. **Near me** — request a listing (area + km only).
6. **Requests** — approve or decline incoming asks. Owner contact is shown only after approval.

Fit is deterministic: a piece fits if it can be placed on a scrap in either orientation, using leftover rectangles. Measurements are never inferred by a model.

## Reset demo data

In the browser console:

```js
localStorage.removeItem("soochi_demo_state")
localStorage.removeItem("soochi_token")
localStorage.removeItem("soochi_user_id")
```

Then refresh and log in again.

## Checks

```bash
cd frontend
npm run lint
npm run build
```
