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

## Connect Render to Ollama on your Mac through Cloudflare Tunnel

The Ollama API must not be published directly. Run the token-protected gateway
in `backend.ai.ollama_proxy` on the Mac; it listens only on `127.0.0.1:11435`
and forwards a small allowlist of API requests to Ollama on
`127.0.0.1:11434`. Requests without the shared bearer token are rejected.

1. Keep Ollama running on the Mac and pull the models the backend uses:

   ```bash
   ollama pull gemma3:4b
   ollama pull nomic-embed-text
   ```

2. Generate a long random token:

   ```bash
   python3 -c 'import secrets; print(secrets.token_urlsafe(48))'
   ```

   Copy it somewhere private. Do not send it in chat or commit it to Git.

3. In the Mac terminal that will run the gateway, set the token and start the
   gateway from the repository root:

   ```bash
   export OLLAMA_PROXY_TOKEN='paste-the-generated-token-here'
   python3 -m uvicorn backend.ai.ollama_proxy:app --host 127.0.0.1 --port 11435
   ```

   Keep this terminal open. Ollama, the gateway, Cloudflare Tunnel, the Mac,
   and its hotspot must stay online for Render to use the model.

4. In Cloudflare, add a **Published application** route to the already healthy
   tunnel. Choose a hostname such as `ollama.your-domain.com` and set its
   service URL to `http://127.0.0.1:11435`. Do not point the route at port
   `11434`. The gateway itself requires the bearer token, so the public route
   does not expose the unprotected Ollama API.

5. Verify the route from a terminal. With no token, the request should return
   `401 Unauthorized`:

   ```bash
   curl -i https://ollama.your-domain.com/api/tags
   ```

   Then send the token; this should return a JSON list of installed models:

   ```bash
   export OLLAMA_PROXY_TOKEN='paste-the-same-generated-token-here'
   curl -i -H "Authorization: Bearer $OLLAMA_PROXY_TOKEN" \
     https://ollama.your-domain.com/api/tags
   ```

6. In the Render dashboard, open the `soochi-api` service's **Environment**
   settings and add:

   - `OLLAMA_HOST` = `https://ollama.your-domain.com`
   - `OLLAMA_PROXY_TOKEN` = the same random token

   Save and redeploy the API. The backend sends the bearer token to the
   gateway for vision tagging and RAG embedding/chat requests. Never put this
   token in a `VITE_` frontend variable; frontend values are public.

If the Mac sleeps, loses its hotspot, or any of the three local processes
stops, remote Ollama requests will fail. The backend's image-tagging path then
uses its documented safe defaults; RAG reports guidance unavailable.
