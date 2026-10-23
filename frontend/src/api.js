
import demo from './mock/demo.json'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const state = JSON.parse(JSON.stringify(demo))
let nextScrapId = Math.max(0, ...state.scraps.map((s) => s.id)) + 1
let nextRequestId = 1

function getToken() {
  return localStorage.getItem('soochi_token')
}

function saveToken(token) {
  localStorage.setItem('soochi_token', token)
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const token = getToken()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // Let the browser set Content-Type automatically for FormData.
  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed: ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

// Authentication

export async function signup(data) {
  if (!USE_MOCK) {
    const result = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    saveToken(result.token)
    return result
  }

  const result = {
    token: 'soochi-demo-token',
    user: {
      ...state.user,
      ...data,
      id: state.user.id,
    },
  }

  state.user = result.user
  saveToken(result.token)
  return clone(result)
}

export async function login(data) {
  if (!USE_MOCK) {
    const result = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    saveToken(result.token)
    return result
  }

  if (data.contact !== state.user.contact) {
    throw new Error('Demo login: use the contact shown in demo.json.')
  }

  const result = {
    token: 'soochi-demo-token',
    user: state.user,
  }

  saveToken(result.token)
  return clone(result)
}

export function logout() {
  localStorage.removeItem('soochi_token')
}

// Fabric inventory

export async function analyzeScraps(image) {
  if (USE_MOCK) return clone(state.analyze)

  const formData = new FormData()
  formData.append('image', image)

  return request('/scraps/analyze', {
    method: 'POST',
    body: formData,
  })
}

export async function saveScraps(scraps) {
  if (!USE_MOCK) {
    return request('/scraps', {
      method: 'POST',
      body: JSON.stringify(scraps),
    })
  }

  const saved = scraps.map((scrap) => ({
    ...scrap,
    id: nextScrapId++,
  }))

  state.scraps.push(...clone(saved))
  return clone(saved)
}

export async function getMyScraps() {
  if (!USE_MOCK) return request('/scraps/mine')
  return clone(state.scraps)
}

// Products and matching

export async function getProducts() {
  if (!USE_MOCK) return request('/products')
  return clone(state.products)
}

export async function matchScrapsToProducts(scrapIds) {
  if (!USE_MOCK) {
    return request('/match/scraps-to-products', {
      method: 'POST',
      body: JSON.stringify({ scrap_ids: scrapIds }),
    })
  }

  const selected = state.scraps.filter((s) => scrapIds.includes(s.id))
  if (!selected.length) return []

  return clone(state.productMatches)
}

export async function matchProductToScraps(input) {
  if (!USE_MOCK) {
    return request('/match/product-to-scraps', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  return clone(state.customMatch)
}

// Sharing requests

export async function createRequest(scrapId) {
  if (!USE_MOCK) {
    return request('/requests', {
      method: 'POST',
      body: JSON.stringify({ scrap_id: scrapId }),
    })
  }

  const scrap = state.customMatch.nearby.find(
    (item) => item.scrap.id === scrapId
  )

  if (!scrap) throw new Error('Demo scrap not found.')

  const created = {
    id: nextRequestId++,
    scrap_id: scrapId,
    scrap,
    requester_id: state.user.id,
    requester_name: state.user.name,
    owner_contact: null,
    status: 'pending',
  }

  state.requests.push(created)
  return clone(created)
}

export async function getIncomingRequests() {
  if (!USE_MOCK) return request('/requests/incoming')

  return clone(
    state.requests.filter((item) => item.owner_id === state.user.id)
  )
}

export async function getOutgoingRequests() {
  if (!USE_MOCK) return request('/requests/outgoing')

  return clone(
    state.requests
      .filter((item) => item.requester_id === state.user.id)
      .map((item) => ({
        ...item,
        owner_contact:
          item.status === 'approved' ? item.owner_contact : null,
      }))
  )
}

export async function respondToRequest(id, action) {
  if (!USE_MOCK) {
    return request(`/requests/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
  }

  const item = state.requests.find((r) => r.id === id)
  if (!item) throw new Error('Request not found.')
  if (!['approve', 'decline'].includes(action)) {
    throw new Error('Action must be approve or decline.')
  }

  item.status = action === 'approve' ? 'approved' : 'declined'

  if (item.status === 'approved') {
    item.owner_contact = state.user.contact
  }

  return clone(item)
}
