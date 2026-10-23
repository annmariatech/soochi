import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getAreas, resolveAreaFromCoords, signup } from "../api"

export default function SignupPage() {
  const navigate = useNavigate()
  const areas = getAreas()
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [areaName, setAreaName] = useState(areas[0].name)
  const [coords, setCoords] = useState(null)
  const [locationNote, setLocationNote] = useState(
    "Exact coordinates stay private. Other makers only see your area name.",
  )
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [asking, setAsking] = useState(false)

  function handleLocation() {
    if (!navigator.geolocation) {
      setLocationNote("This browser cannot share location. Pick an area instead.")
      return
    }
    setAsking(true)
    setError("")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const resolved = resolveAreaFromCoords(
          position.coords.latitude,
          position.coords.longitude,
        )
        setAreaName(resolved.area_name)
        setCoords({ lat: resolved.lat, lng: resolved.lng })
        setLocationNote(
          `Approximate area set to ${resolved.area_name}. Your exact coordinates are stored only on this device.`,
        )
        setAsking(false)
      },
      () => {
        setLocationNote("Permission declined. Choose an area from the list instead.")
        setAsking(false)
      },
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      await signup({
        name,
        contact,
        area_name: areaName,
        lat: coords?.lat ?? areas.find((area) => area.name === areaName)?.lat,
        lng: coords?.lng ?? areas.find((area) => area.name === areaName)?.lng,
      })
      navigate("/inventory", { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="other-paper gingham">
        <form className="other-inner auth-card" onSubmit={handleSubmit}>
          <span className="eyebrow">A NEW LITTLE STUDIO</span>
          <h1>Join Soochi.</h1>
          <p>Save leftovers, find nearby fabric, and keep textile waste out of the bin.</p>

          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label>
            Contact number
            <input
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              inputMode="numeric"
              required
            />
          </label>

          <div className="location-box">
            <button type="button" className="add-button" onClick={handleLocation} disabled={asking}>
              {asking ? "Asking for permission…" : "Use my approximate area"}
            </button>
            <p>{locationNote}</p>
          </div>

          <label>
            Area
            <select value={areaName} onChange={(event) => setAreaName(event.target.value)}>
              {areas.map((area) => (
                <option key={area.name}>{area.name}</option>
              ))}
            </select>
          </label>

          {error && <p className="error-note">{error}</p>}
          <button className="primary-button" disabled={loading}>
            {loading ? "Stitching your account…" : "Create account"}
          </button>
          <p className="auth-switch">
            Already have a basket? <Link to="/login">Log in</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
