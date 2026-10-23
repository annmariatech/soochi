import seed from "./demo.json"
import { haversineKm, nearestArea, roundKm } from "../lib/scraps"

const STATE_KEY = "soochi_demo_state"
const TOKEN_KEY = "soochi_token"
const USER_KEY = "soochi_user_id"

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function blankState() {
  const state = clone(seed)
  state.nextScrapId = Math.max(0, ...state.scraps.map((item) => item.id)) + 1
  state.nextRequestId = Math.max(0, ...state.requests.map((item) => item.id), 0) + 1
  state.nextUserId = Math.max(0, ...state.users.map((item) => item.id)) + 1
  return state
}

function readState() {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...blankState(),
        ...parsed,
        areas: seed.areas,
        products: seed.products,
        analyze: seed.analyze,
      }
    }
  } catch {
    // Fall through to seed data if local storage is unreadable.
  }
  return blankState()
}

let state = readState()

function persist() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state))
}

function wait(ms = 280) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getSessionUser() {
  const id = Number(localStorage.getItem(USER_KEY))
  return state.users.find((user) => user.id === id) || null
}

function requireUser() {
  const user = getSessionUser()
  if (!user || !getToken()) {
    throw new Error("Please log in to continue.")
  }
  return user
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    contact: user.contact,
    area_name: user.area_name,
  }
}

function setSession(user) {
  localStorage.setItem(TOKEN_KEY, `soochi-demo-${user.id}`)
  localStorage.setItem(USER_KEY, String(user.id))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getAreas() {
  return clone(seed.areas)
}

export async function signup(data) {
  await wait()
  const contact = String(data.contact || "").trim()
  const name = String(data.name || "").trim()
  if (!name) throw new Error("Please add your name.")
  if (!/^\d{10}$/.test(contact)) {
    throw new Error("Enter a 10-digit contact number.")
  }
  if (state.users.some((user) => user.contact === contact)) {
    throw new Error("That contact is already signed up. Try logging in.")
  }

  const user = {
    id: state.nextUserId++,
    name,
    contact,
    area_name: data.area_name || "Kalamassery",
    lat: data.lat ?? null,
    lng: data.lng ?? null,
  }
  state.users.push(user)
  persist()
  setSession(user)
  return { token: getToken(), user: publicUser(user) }
}

export async function login(data) {
  await wait()
  const contact = String(data.contact || "").trim()
  const user = state.users.find((item) => item.contact === contact)
  if (!user) {
    throw new Error("No demo account for that contact. Sign up, or use 9876543210.")
  }
  setSession(user)
  return { token: getToken(), user: publicUser(user) }
}

export function logout() {
  clearSession()
}

export async function analyzeScraps() {
  await wait(700)
  return clone(seed.analyze)
}

export async function saveScraps(scraps) {
  await wait()
  const user = requireUser()
  const saved = scraps.map((scrap, index) => {
    const tags = {
      fabric_type: scrap.fabric_type || scrap.tags?.fabric_type || "Other",
      stretch: scrap.stretch || scrap.tags?.stretch || "Unknown",
      weight: scrap.weight || scrap.tags?.weight || "Unknown",
      pattern: scrap.pattern || scrap.tags?.pattern || "Solid",
      dominant_color:
        scrap.color_name || scrap.tags?.dominant_color || "New colour",
      defects: scrap.tags?.defects || [],
    }
    return {
      id: state.nextScrapId++,
      owner_id: user.id,
      name: scrap.name || tags.fabric_type || `Scrap ${index + 1}`,
      width_cm: Number(scrap.width_cm),
      height_cm: Number(scrap.height_cm),
      color_hex: scrap.color_hex || "#D9879A",
      color_name: tags.dominant_color,
      crop_url:
        scrap.crop_url ||
        `https://placehold.co/500x400/${String(scrap.color_hex || "F5E4DE").replace("#", "")}/754653?text=New+Scrap`,
      tags,
    }
  })
  state.scraps.push(...saved)
  persist()
  return clone(saved)
}

export async function getMyScraps() {
  await wait(120)
  const user = requireUser()
  return clone(state.scraps.filter((scrap) => scrap.owner_id === user.id))
}

export async function getProducts() {
  await wait(80)
  return clone(state.products)
}

export function attachOwner(scrap) {
  const owner = state.users.find((user) => user.id === scrap.owner_id)
  return {
    scrap: clone(scrap),
    owner_id: owner?.id,
    owner_name: owner?.name,
    owner_area: owner?.area_name || "Nearby",
    distance_km: roundKm(
      haversineKm(getSessionUser(), owner) ??
        haversineKm(
          seed.areas.find((area) => area.name === getSessionUser()?.area_name),
          seed.areas.find((area) => area.name === owner?.area_name),
        ) ??
        3,
    ),
  }
}

export async function getNearbyScraps() {
  await wait(120)
  const user = requireUser()
  return state.scraps
    .filter((scrap) => scrap.owner_id !== user.id)
    .map((scrap) => attachOwner(scrap))
    .sort((a, b) => a.distance_km - b.distance_km)
}

export async function createRequest(scrapId) {
  await wait()
  const user = requireUser()
  const scrap = state.scraps.find((item) => item.id === Number(scrapId))
  if (!scrap) throw new Error("That scrap is no longer listed.")
  if (scrap.owner_id === user.id) {
    throw new Error("That scrap is already in your basket.")
  }
  const existing = state.requests.find(
    (item) =>
      item.scrap_id === scrap.id &&
      item.requester_id === user.id &&
      item.status === "pending",
  )
  if (existing) return clone(existing)

  const created = {
    id: state.nextRequestId++,
    scrap_id: scrap.id,
    owner_id: scrap.owner_id,
    requester_id: user.id,
    requester_name: user.name,
    requester_area: user.area_name,
    owner_contact: null,
    status: "pending",
  }
  state.requests.push(created)
  persist()
  return clone(created)
}

function withScrap(request, hideContact) {
  const scrap = state.scraps.find((item) => item.id === request.scrap_id)
  const owner = state.users.find((item) => item.id === request.owner_id)
  return {
    ...clone(request),
    scrap: scrap ? clone(scrap) : null,
    owner_area: owner?.area_name || "Nearby",
    owner_name: owner?.name || "Maker",
    owner_contact: hideContact ? null : request.owner_contact,
  }
}

export async function getIncomingRequests() {
  await wait(120)
  const user = requireUser()
  return state.requests
    .filter((item) => item.owner_id === user.id)
    .map((item) => withScrap(item, item.status !== "approved"))
}

export async function getOutgoingRequests() {
  await wait(120)
  const user = requireUser()
  return state.requests
    .filter((item) => item.requester_id === user.id)
    .map((item) => withScrap(item, item.status !== "approved"))
}

export async function respondToRequest(id, action) {
  await wait()
  const user = requireUser()
  const item = state.requests.find((request) => request.id === Number(id))
  if (!item) throw new Error("Request not found.")
  if (item.owner_id !== user.id) {
    throw new Error("Only the scrap owner can respond.")
  }
  if (!["approve", "decline"].includes(action)) {
    throw new Error("Choose approve or decline.")
  }
  item.status = action === "approve" ? "approved" : "declined"
  item.owner_contact = item.status === "approved" ? user.contact : null
  persist()
  return withScrap(item, item.status !== "approved")
}

export function resolveAreaFromCoords(lat, lng) {
  const match = nearestArea(lat, lng, seed.areas)
  return {
    area_name: match.name,
    lat,
    lng,
    distance_km: roundKm(match.distance_km),
  }
}
