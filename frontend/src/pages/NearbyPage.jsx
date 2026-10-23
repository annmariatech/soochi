import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import ScrapCard from "../components/ScrapCard"
import { createRequest, currentUser, getNearbyListings } from "../api"
import { toCardScrap } from "../lib/scraps"

export default function NearbyPage() {
  const navigate = useNavigate()
  const user = currentUser()
  const [items, setItems] = useState([])
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    getNearbyListings()
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [])

  async function requestScrap(scrapId) {
    setError("")
    try {
      await createRequest(scrapId)
      setNotice("Request sent. You will see it under outgoing requests.")
      navigate("/requests")
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="page-main">
      <section className="other-paper gingham nearby-hero">
        <div className="other-inner">
          <span className="eyebrow">MAKERS HELPING MAKERS</span>
          <h1>Good things are nearby.</h1>
          <p>
            Listings around {user?.area_name || "your area"} show an area name and
            approximate distance — never a pin or exact coordinates.
          </p>
        </div>
      </section>

      {error && <p className="error-note">{error}</p>}
      {notice && <p className="success-note">{notice}</p>}

      <div className="scrap-grid">
        {items.map((item) => (
          <ScrapCard
            key={item.scrap.id}
            scrap={toCardScrap(item.scrap)}
            extra={
              <div className="nearby-meta">
                <p>
                  {item.owner_name} · {item.owner_area} · {item.distance_km} km
                </p>
                <button className="primary-button" onClick={() => requestScrap(item.scrap.id)}>
                  Request this scrap
                </button>
              </div>
            }
          />
        ))}
      </div>
    </main>
  )
}
