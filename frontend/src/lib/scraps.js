export const FABRIC_TYPES = [
  "Cotton", "Denim", "Silk", "Linen", "Polyester", "Wool", "Knit", "Other",
]
export const STRETCH = ["None", "Low", "High"]
export const WEIGHTS = ["Light", "Medium", "Heavy"]
export const PATTERNS = ["Solid", "Striped", "Floral", "Checked", "Printed", "Other"]

export function toCardScrap(scrap) {
  const tags = scrap.tags || {}
  return {
    ...scrap,
    name: scrap.name || `Scrap ${scrap.id ?? "new"}`,
    type: scrap.type || tags.fabric_type || scrap.fabric_type || "Fabric",
    pattern: scrap.pattern || tags.pattern || "Solid",
    weight: scrap.weight || tags.weight || "Medium",
    stretch: scrap.stretch || tags.stretch || "None",
    colorName: scrap.colorName || scrap.color_name || tags.dominant_color || "Unknown",
    color: scrap.color || scrap.color_hex,
    width: scrap.width ?? scrap.width_cm,
    height: scrap.height ?? scrap.height_cm,
  }
}

export function haversineKm(a, b) {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null
  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const latDelta = toRadians(b.lat - a.lat)
  const lngDelta = toRadians(b.lng - a.lng)
  const h =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(lngDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function roundKm(distance) {
  return Math.round(Number(distance) * 10) / 10
}

export function nearestArea(lat, lng, areas) {
  if (!areas?.length) return { name: "Nearby", distance_km: 0 }
  return areas
    .map((area) => ({
      ...area,
      distance_km: haversineKm({ lat, lng }, area) ?? 0,
    }))
    .sort((a, b) => a.distance_km - b.distance_km)[0]
}
