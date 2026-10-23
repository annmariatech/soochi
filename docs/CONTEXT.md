PROJECT: A web app for small tailors/designers to reuse leftover fabric scraps.
Users sign up (name, contact, location), photograph scraps next to a reference
marker, and the app stores each scrap (size in cm, color, fabric tags).
Mode A: select scraps -> get product suggestions.
Mode B: enter a product + dimensions -> see which stored scraps fit.
If scraps fall short, show nearby users who have suitable scraps; the user can
send a request, the owner approves, and only then is contact info revealed.

STACK (free/open source only): React (Vite) + Tailwind + Leaflet/OpenStreetMap;
Python FastAPI; SQLite (SQLAlchemy); OpenCV + Shapely; Ollama (gemma3:4b for
vision tagging, nomic-embed-text for embeddings); ChromaDB for RAG.

RULES: Measurements, fit checks and shortage math are done by plain code
(OpenCV/Shapely), never by an LLM. Keep code simple and well commented.
Do not add libraries I did not ask for. Build in small steps and tell me how to
run and test each step.

API CONTRACT (JSON; all except signup/login need header Authorization: Bearer <token>):
POST /auth/signup   {name, contact, password, lat, lng, area_name} -> {token, user}
POST /auth/login    {contact, password} -> {token, user}
POST /scraps/analyze  (multipart: image) -> {annotated_image_url, scraps:[
    {temp_id, width_cm, height_cm, color_hex, polygon:[[x,y],...], crop_url,
     tags:{fabric_type, stretch, weight, pattern, dominant_color, defects:[...]}}]}
POST /scraps        [{temp_id, width_cm, height_cm, color_hex, crop_url, tags}] -> saved scraps (with ids)
GET  /scraps/mine   -> [scrap]
GET  /products      -> [{id, name, size_label, pieces:[{w_cm,h_cm,qty}], fabric_notes}]
POST /match/scraps-to-products  {scrap_ids:[...]} ->
    [{product_id, name, size_label, utilization_pct,
      verdict:{suitable, reason}, sources:[{id,text}]}]
POST /match/product-to-scraps   {product_id | custom:{name,width_cm,height_cm}} ->
    {matches:[{scrap, utilization_pct, verdict, sources}],
     shortage: null | {missing_width_cm, missing_height_cm},
     nearby:[{scrap, owner_area, distance_km}]}
POST /requests      {scrap_id} -> request
GET  /requests/incoming , GET /requests/outgoing -> [request]
   (outgoing requests include owner_contact only when status == "approved")
POST /requests/{id}/respond  {action: "approve"|"decline"} -> request
Location shown to others is area-level only (area_name + distance), never exact lat/lng.