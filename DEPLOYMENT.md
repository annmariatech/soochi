# Public deployment

The repo includes a Render Blueprint at `render.yaml`. It describes a static
frontend, FastAPI service, Render Postgres database, persistent upload/Chroma
disk, HTTPS health check, generated JWT secret, and the frontend-to-API CORS
and URL wiring. Both services deploy the `main` branch.

## Deploy

1. Merge the deployment setup and all features you want to publish from
   `integration` into `main`, then push `main` to the connected Git remote.
   The deployment will not contain work that exists only on `integration`.
2. In Render, create a Blueprint from this repository and review the resources
   and plans before applying. The API service, persistent disk, and Postgres
   plan in the Blueprint are paid resources; inspect current pricing first.
3. Wait for the frontend and API services and the database to become healthy.
   Open the frontend service URL, create an account, and test signup, login,
   image analysis, saving a scrap, favourites, nearby listings, and requests.
4. To enable image tagging, configure `OLLAMA_HOST` on the API service to a
   reachable Ollama endpoint that has `gemma3:4b` pulled. Do not expose an
   unauthenticated Ollama port to the public internet. If Ollama is absent,
   image tagging intentionally falls back to safe default labels. The RAG
   module is not currently called by the product-matching API.

Render's managed Postgres URL is normalized to SQLAlchemy's psycopg 3 driver.
User image files and the optional Chroma persistence path use the attached
`/var/data` disk. That disk belongs to one API instance, so the API is kept at
one instance; Postgres holds relational data. The static frontend rewrites
client-side routes to `index.html` and is built with the API's public HTTPS URL.

## Before a wider launch

- Set up a monitored, private Ollama endpoint; `OLLAMA_HOST` is deliberately
  not committed as a URL or credential.
- Confirm the hosting account's backup and retention settings, especially for
  database and uploaded user images.
- Configure a custom domain only after the generated `onrender.com` URLs work.
- Review the location and image data collected by the app and publish an
  appropriate privacy notice for users.

The Blueprint does not deploy anything by itself. Render provisions the
services only after you connect the repository and apply the Blueprint.
