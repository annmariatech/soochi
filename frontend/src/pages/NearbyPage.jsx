import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import ScrapCard from "../components/ScrapCard"
import NearbyMap from "../components/NearbyMap"
import PageHeader from "../components/PageHeader"
import { createRequest, currentUser, getFavourites, getNearbyListings, setFavourite } from "../api"
import { toCardScrap } from "../lib/scraps"

export default function NearbyPage() {
  const navigate = useNavigate()
  const user = currentUser()
  const [items, setItems] = useState([])
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [favouriteIds, setFavouriteIds] = useState(new Set())

  useEffect(() => {
    Promise.all([getNearbyListings(), getFavourites()])
      .then(([listings, favourites]) => {
        setItems(listings)
        setFavouriteIds(new Set(favourites.map((item) => item.id)))
      })
      .catch((err) => setError(err.message))
  }, [])

  async function toggleFavourite(id, favourite) {
    try {
      await setFavourite(id, favourite)
      setFavouriteIds((current) => {
        const next = new Set(current)
        favourite ? next.add(id) : next.delete(id)
        return next
      })
    } catch (err) { setError(err.message) }
  }

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
      <PageHeader
        className="nearby-hero"
        eyebrow="MAKERS HELPING MAKERS"
        title="Good things are nearby."
        description={"Listings around " + (user?.area_name || "your area") + " show an area name and approximate distance — never a pin or exact coordinates."}
      />

      {error && <p className="error-note">{error}</p>}
      {notice && <p className="success-note">{notice}</p>}

      <NearbyMap items={items} user={user} />

      <div className="scrap-grid">
        {items.map((item) => (
          <ScrapCard
            key={item.scrap.id}
            scrap={toCardScrap(item.scrap)}
            favourited={favouriteIds.has(item.scrap.id)}
            onFavourite={toggleFavourite}
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
