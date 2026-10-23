import { useEffect } from "react"
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"

function FitMapBounds({ items, user }) {
  const map = useMap()
  useEffect(() => {
    const points = [
      [Number(user?.lat) || 10.027, Number(user?.lng) || 76.328],
      ...items.filter((item) => item.map_location).map((item) => [item.map_location.lat, item.map_location.lng]),
    ]
    if (points.length > 1) map.fitBounds(points, { padding: [28, 28], maxZoom: 13 })
  }, [items, map, user])
  return null
}

export default function NearbyMap({ items, user }) {
  const center = [Number(user?.lat) || 10.027, Number(user?.lng) || 76.328]
  return (
    <div className="nearby-map" aria-label="Map of nearby fabric listings">
      <MapContainer center={center} zoom={12} scrollWheelZoom={false}>
        <FitMapBounds items={items} user={user} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker center={center} radius={9} pathOptions={{ color: "#9c5060", fillColor: "#d9879a", fillOpacity: 0.95 }}>
          <Tooltip>Your approximate location</Tooltip>
        </CircleMarker>
        {items.filter((item) => item.map_location).map((item) => (
          <CircleMarker key={item.scrap.id} center={[item.map_location.lat, item.map_location.lng]} radius={8} pathOptions={{ color: "#4d6d56", fillColor: "#91ad83", fillOpacity: 0.9 }}>
            <Tooltip>{item.owner_area}: {item.scrap.name}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <p className="map-caption">Listing pins are approximate neighborhood locations.</p>
    </div>
  )
}
