import {
  analyzeScraps as mockAnalyze,
  saveScraps as mockSave,
  getMyScraps as mockMine,
  getProducts as mockProducts,
  getNearbyScraps as mockNearby,
  createRequest as mockCreateRequest,
  getIncomingRequests as mockIncoming,
  getOutgoingRequests as mockOutgoing,
  respondToRequest as mockRespond,
  signup as mockSignup,
  login as mockLogin,
  logout as mockLogout,
  getSessionUser,
  getToken,
  getAreas,
  resolveAreaFromCoords,
} from "./mock/store"
import { matchProductToScraps as calcProductMatch, matchScrapsToProducts as calcScrapMatch } from "./lib/matching"

export async function signup(data) {
  return mockSignup(data)
}

export async function login(data) {
  return mockLogin(data)
}

export function logout() {
  mockLogout()
}

export function currentUser() {
  const user = getSessionUser()
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    contact: user.contact,
    area_name: user.area_name,
  }
}

export function isLoggedIn() {
  return Boolean(getToken() && getSessionUser())
}

export async function analyzeScraps(image) {
  if (!image) throw new Error("Please take or upload a fabric photo first.")
  return mockAnalyze(image)
}

export async function saveScraps(scraps) {
  return mockSave(scraps)
}

export async function getMyScraps() {
  return mockMine()
}

export async function getProducts() {
  return mockProducts()
}

export async function matchScrapsToProducts(scrapIds) {
  const [mine, products] = await Promise.all([mockMine(), mockProducts()])
  const selected = mine.filter((scrap) => scrapIds.includes(scrap.id))
  if (!selected.length) return []
  return calcScrapMatch(selected, products)
}

export async function matchProductToScraps(input) {
  const [mine, nearby] = await Promise.all([mockMine(), mockNearby()])
  const product = {
    name: input.name || "Custom project",
    size_label: input.size_label || "Custom",
    pieces: [
      {
        w_cm: Number(input.w_cm),
        h_cm: Number(input.h_cm),
        qty: Math.max(1, Number(input.qty) || 1),
      },
    ],
    fabric_notes: input.fabric_notes || "",
  }
  return calcProductMatch(product, mine, nearby)
}

export async function getNearbyListings() {
  return mockNearby()
}

export async function createRequest(scrapId) {
  return mockCreateRequest(scrapId)
}

export async function getIncomingRequests() {
  return mockIncoming()
}

export async function getOutgoingRequests() {
  return mockOutgoing()
}

export async function respondToRequest(id, action) {
  return mockRespond(id, action)
}

export { getAreas, resolveAreaFromCoords, getToken }
