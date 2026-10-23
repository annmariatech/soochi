import seed from "./mock/demo.json"
import { nearestArea, roundKm } from "./lib/scraps"

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "")
const TOKEN_KEY = "soochi_token"
const USER_KEY = "soochi_user"

function apiOrigin() {
  if (API_BASE.startsWith("/")) return window.location.origin
  return new URL(API_BASE, window.location.origin).origin
}

function mediaUrl(url) {
  if (!url || /^(data:|https?:\/\/|blob:)/i.test(url)) return url
  return `${apiOrigin()}${url.startsWith("/") ? "" : "/"}${url}`
}

async function request(path, { body, formData, ...options } = {}) {
  const headers = new Headers(options.headers || {})
  const token = getToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (body !== undefined) headers.set("Content-Type", "application/json")

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    method: options.method || (body !== undefined || formData ? "POST" : "GET"),
    headers,
    body: formData || (body === undefined ? undefined : JSON.stringify(body)),
  })

  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload?.detail
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join("; ")
      : typeof detail === "string"
        ? detail
        : `Request failed (${response.status})`
    throw new Error(message)
  }
  return payload
}

function storeSession(auth) {
  localStorage.setItem(TOKEN_KEY, auth.token)
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user))
  // Remove the old demo session so it cannot be mistaken for a backend login.
  localStorage.removeItem("soochi_user_id")
  return auth
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export async function signup(data) {
  return storeSession(await request("/auth/signup", { body: data }))
}

export async function login(data) {
  return storeSession(await request("/auth/login", { body: data }))
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem("soochi_user_id")
}

export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null")
  } catch {
    return null
  }
}

export async function updateProfile(data) {
  const user = await request("/users/me", { body: data, method: "PATCH" })
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}

export function getProfile() {
  return request("/users/me")
}

export function isLoggedIn() {
  return Boolean(getToken() && currentUser())
}

export async function analyzeScraps(image) {
  if (!image) throw new Error("Please take or upload a fabric photo first.")
  const formData = new FormData()
  formData.append("image", image)
  const result = await request("/scraps/analyze", { formData })
  return {
    ...result,
    annotated_image_url: mediaUrl(result.annotated_image_url),
    scraps: (result.scraps || []).map((scrap) => ({
      ...scrap,
      crop_url: mediaUrl(scrap.crop_url),
    })),
  }
}

export async function saveScraps(scraps) {
  const payload = scraps.map((scrap, index) => ({
    temp_id: scrap.temp_id || `scrap-${index + 1}`,
    name: scrap.name,
    width_cm: Number(scrap.width_cm),
    height_cm: Number(scrap.height_cm),
    area_cm2: scrap.area_cm2 == null ? null : Number(scrap.area_cm2),
    shape_type: scrap.shape_type || "rectangle",
    radius_cm: scrap.radius_cm == null ? null : Number(scrap.radius_cm),
    color_hex: scrap.color_hex,
    crop_url: scrap.crop_url || "",
    tags: {
      ...scrap.tags,
      fabric_type: scrap.fabric_type || scrap.tags?.fabric_type || "other",
      stretch: scrap.stretch || scrap.tags?.stretch || "none",
      weight: scrap.weight || scrap.tags?.weight || "medium",
      pattern: scrap.pattern || scrap.tags?.pattern || "solid",
      dominant_color:
        scrap.color_name || scrap.tags?.dominant_color || "unknown",
      defects: scrap.tags?.defects || [],
    },
  }))
  return request("/scraps", { body: payload }).then((items) =>
    items.map((item) => ({ ...item, crop_url: mediaUrl(item.crop_url) })),
  )
}

export async function getMyScraps() {
  const scraps = await request("/scraps/mine")
  return scraps.map((scrap) => ({ ...scrap, crop_url: mediaUrl(scrap.crop_url) }))
}

export async function getFavourites() {
  const items = await request("/favourites")
  return items.map((item) => ({ ...item, crop_url: mediaUrl(item.crop_url) }))
}

export function setFavourite(scrapId, favourite) {
  return request(`/favourites/${scrapId}`, { method: favourite ? "POST" : "DELETE" })
}

export function getProducts() {
  return request("/products")
}

export async function matchScrapsToProducts(scrapIds) {
  const [matches, products] = await Promise.all([
    request("/match/scraps-to-products", { body: { scrap_ids: scrapIds } }),
    getProducts(),
  ])
  const byId = new Map(products.map((product) => [product.id, product]))
  return matches.map((match) => ({ ...byId.get(match.product_id), ...match }))
}

export async function matchProductToScraps(input) {
  const [result, mine, nearby] = await Promise.all([
    request("/match/product-to-scraps", {
      body: {
        custom: {
          name: input.name || "Custom project",
          width_cm: Number(input.w_cm),
          height_cm: Number(input.h_cm),
        },
      },
    }),
    getMyScraps(),
    getNearbyListings(),
  ])
  const ownScraps = new Map(mine.map((scrap) => [scrap.id, scrap]))
  return {
    ...result,
    // The match endpoint currently supplies mock suggestions. Resolve them to
    // actual saved scraps so that displayed cards and request actions use IDs
    // that exist in this user's database.
    matches: (result.matches || [])
      .filter((item) => ownScraps.has(item.scrap?.id))
      .map((item) => ({ ...item, scrap: ownScraps.get(item.scrap.id) })),
    nearby: nearby.map((item) => ({
      ...item,
      verdict: {
        suitable: true,
        reason: "This nearby maker has a scrap available to request.",
      },
    })),
  }
}

export async function getNearbyListings() {
  const listings = await request("/nearby")
  return listings.map((item) => ({
    ...item,
    scrap: { ...item.scrap, crop_url: mediaUrl(item.scrap?.crop_url) },
  }))
}

export function createRequest(scrapId) {
  return request("/requests", { body: { scrap_id: Number(scrapId) } })
}

function normalizeRequest(item, incoming) {
  return {
    ...item,
    scrap: item.scrap
      ? { ...item.scrap, crop_url: mediaUrl(item.scrap.crop_url) }
      : null,
    requester_name: item.requester?.name || item.requester_name,
    requester_area: item.requester?.area_name || item.requester_area,
    owner_name: item.owner_name || (incoming ? undefined : "Maker"),
  }
}

export async function getIncomingRequests() {
  return (await request("/requests/incoming")).map((item) =>
    normalizeRequest(item, true),
  )
}

export async function getOutgoingRequests() {
  return (await request("/requests/outgoing")).map((item) =>
    normalizeRequest(item, false),
  )
}

export function respondToRequest(id, action) {
  return request(`/requests/${id}/respond`, { body: { action } })
}

export function getAreas() {
  return structuredClone(seed.areas)
}

export function resolveAreaFromCoords(lat, lng) {
  const match = nearestArea(lat, lng, seed.areas)
  return { area_name: match.name, lat, lng, distance_km: roundKm(match.distance_km) }
}
