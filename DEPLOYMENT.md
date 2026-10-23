# Free Render deployment

The repo includes a Render Blueprint at `render.yaml`. It describes a free
static frontend, free FastAPI web service, and free Render Postgres database.
It also configures the health check, generated JWT secret, and frontend-to-API
CORS and URL wiring. Both services deploy the `main` branch.

## Deploy without paid plans

1. Make sure the desired code and `render.yaml` are on `main` and pushed to
   the connected Git remote. The Blueprint deploys `main`.
2. In Render, choose **New + → Blueprint**, connect this repository, select
   `main`, and use the root `render.yaml` file.
3. Review the Blueprint's planned resources and confirm each service and
   database uses the **Free** plan before applying it. The frontend static site
   is free as well.
4. Deploy the Blueprint. Wait for the API, frontend, and database to finish
   provisioning. Open the API's `/health` endpoint and `/docs`, then load the
   frontend URL and create an account.
5. Try signup/login, photo analysis, saving scraps, favourites, nearby
   listings, and requests. Configure `OLLAMA_HOST` on the API only if you
   have an Ollama endpoint reachable from Render with `gemma3:4b` available.

Render free services are for testing and hobby projects, not production:

- The API can sleep after 15 minutes without traffic; the first request after
  sleep can take about a minute to wake it.
- The free Postgres database is limited to 1 GB and expires 30 days after
  creation. After expiry, it can be upgraded during a 14-day grace period;
  otherwise Render deletes the database and its data.
- Free web services have an ephemeral filesystem and cannot use persistent
  disks. Uploaded photos and Chroma index files can disappear on restart,
  sleep, or redeploy. User records in Postgres persist only until the free
  database expires.
- Free Postgres has no backups. Export anything you need to keep before the
  database expires.
- Free web services have 750 shared instance hours per workspace per month;
  excess bandwidth or build usage can suspend free services/builds if there is
  no payment method.

These limits mean this configuration can run a no-cost demo, but cannot
provide durable image or account storage for a public production launch. For
durable use, move the database to a non-expiring plan and move images to
persistent or object storage. Do not expose an unauthenticated Ollama port to
the public internet. If Ollama is absent, image tagging falls back to safe
defaults. The RAG module is not currently called by the product-matching API.

The Blueprint does not deploy by itself. Render provisions the resources only
after you connect the repository and apply the Blueprint. Check Render's
current free-tier limits before relying on it; they can change.
