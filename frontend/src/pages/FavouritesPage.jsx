import { useEffect, useState } from "react"
import ScrapCard from "../components/ScrapCard"
import { getFavourites, setFavourite } from "../api"
import { toCardScrap } from "../lib/scraps"

export default function FavouritesPage() {
  const [items, setItems] = useState([])
  const [error, setError] = useState("")
  useEffect(() => { getFavourites().then(setItems).catch((err) => setError(err.message)) }, [])

  async function remove(id) {
    try {
      await setFavourite(id, false)
      setItems((current) => current.filter((scrap) => scrap.id !== id))
    } catch (err) { setError(err.message) }
  }

  return (
    <main className="page-main">
      <span className="eyebrow">SAVED FOR LATER</span>
      <h1 className="page-title">Your favourites</h1>
      <p className="page-lead">Keep lovely scraps close while you plan your next make.</p>
      {error && <p className="error-note">{error}</p>}
      <div className="scrap-grid">
        {items.map((scrap) => <ScrapCard key={scrap.id} scrap={toCardScrap(scrap)} favourited onFavourite={remove} />)}
      </div>
      {!items.length && !error && <div className="empty-state"><span>♡</span><h3>No favourites yet</h3><p>Tap the heart on any scrap to save it here.</p></div>}
    </main>
  )
}
