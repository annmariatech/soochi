import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import ScrapCard from "../components/ScrapCard"
import { deleteScrap, getFavourites, getMyScraps, setFavourite } from "../api"
import { toCardScrap } from "../lib/scraps"

export default function InventoryPage() {
  const navigate = useNavigate()
  const [scraps, setScraps] = useState([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [favouriteIds, setFavouriteIds] = useState(new Set())
  const [loadingScraps, setLoadingScraps] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([getMyScraps(), getFavourites()])
      .then(([items, favourites]) => {
        if (active) {
          setScraps(items.map(toCardScrap))
          setFavouriteIds(new Set(favourites.map((item) => item.id)))
          setLoadingScraps(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message)
          setLoadingScraps(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  async function toggleFavourite(id, favourite) {
    try {
      await setFavourite(id, favourite)
      setFavouriteIds((ids) => {
        const next = new Set(ids)
        favourite ? next.add(id) : next.delete(id)
        return next
      })
    } catch (err) { setError(err.message) }
  }

  async function removeScrap(id) {
    const scrap = scraps.find((item) => item.id === id)
    if (!scrap || !window.confirm(`Delete “${scrap.name}” from your scraps? This cannot be undone.`)) return
    setError("")
    setNotice("")
    try {
      await deleteScrap(id)
      setScraps((items) => items.filter((item) => item.id !== id))
      setFavouriteIds((ids) => {
        const next = new Set(ids)
        next.delete(id)
        return next
      })
      setNotice("Scrap deleted.")
    } catch (err) { setError(err.message) }
  }

  const types = useMemo(() => {
    const unique = [...new Set(scraps.map((scrap) => scrap.type).filter(Boolean))]
    return ["All", ...unique]
  }, [scraps])

  const filteredScraps = scraps.filter((scrap) => {
    const matchesSearch = `${scrap.name} ${scrap.type} ${scrap.colorName} ${scrap.pattern}`
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesFilter = filter === "All" || scrap.type === filter
    return matchesSearch && matchesFilter
  })

  const savedAreaCm2 = scraps.reduce((total, scrap) => {
    const explicitArea = Number(scrap.area_cm2)
    if (Number.isFinite(explicitArea) && explicitArea > 0) return total + explicitArea
    if (scrap.shape_type === "circle") {
      const radius = Number(scrap.radius_cm)
      return radius > 0 ? total + Math.PI * radius ** 2 : total
    }
    const width = Number(scrap.width_cm ?? scrap.width)
    const height = Number(scrap.height_cm ?? scrap.height)
    return width > 0 && height > 0 ? total + width * height : total
  }, 0)
  const savedProgress = Math.min((savedAreaCm2 / 5000) * 100, 100)
  const savedAreaLabel = Math.round(savedAreaCm2).toLocaleString()
  const savedSquareMetres = (savedAreaCm2 / 10000).toFixed(2)

  return (
    <>
      <section className="hero-panel gingham">
        <div className="hero-paper">
          <div className="hero-content-grid">
            <div className="hero-copy">
              <span className="eyebrow">A LITTLE LESS WASTE, A LOT MORE WONDER</span>
              <h1>
                Your scraps,
                <br />
                their <span>second life.</span>
              </h1>
              <p>
                Tiny pieces, big possibilities. Let's turn your leftover fabric into
                something lovely.
              </p>
              <button className="primary-button" onClick={() => navigate("/make")}>
                Find something to make <span>↗</span>
              </button>
            </div>

            <aside className="waste-tracker" aria-label="Your fabric saved tracker">
              <div className="tracker-heading">
                <span className="tracker-icon" aria-hidden="true">✳</span>
                <span className="eyebrow">YOUR WASTE TRACKER</span>
              </div>
              <p className="tracker-title">Fabric kept in use</p>
              <div className="tracker-total" aria-live="polite">
                {loadingScraps ? (
                  <span className="tracker-loading">Counting your scraps…</span>
                ) : (
                  <>
                    <strong>{savedAreaLabel}</strong>
                    <span>cm²</span>
                  </>
                )}
              </div>
              <div className="tracker-meta">
                <span>{scraps.length} {scraps.length === 1 ? "piece" : "pieces"} in your collection</span>
                <span>{savedSquareMetres} m²</span>
              </div>
              <div
                className="tracker-progress"
                role="progressbar"
                aria-label="Progress toward 5,000 square centimetres of fabric saved"
                aria-valuemin="0"
                aria-valuemax="5000"
                aria-valuenow={Math.min(Math.round(savedAreaCm2), 5000)}
              >
                <span style={{ width: `${savedProgress}%` }} />
              </div>
              <div className="tracker-footnote">
                {savedAreaCm2 >= 5000 ? "5,000 cm² milestone reached ✨" : "Next milestone · 5,000 cm²"}
              </div>
              <button className="tracker-add" onClick={() => navigate("/add")}>
                Add a scrap <span aria-hidden="true">＋</span>
              </button>
            </aside>
          </div>
        </div>
      </section>

      <main className="inventory-main">
        <div className="welcome-row">
          <div>
            <p className="eyebrow">YOUR LITTLE FABRIC LIBRARY</p>
            <h2>
              The scrap basket <span>♡</span>
            </h2>
          </div>
          <div className="scrap-count">
            <strong>{filteredScraps.length.toString().padStart(2, "0")}</strong>
            <span>pieces</span>
          </div>
        </div>

        <div className="inventory-toolbar">
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a fabric..."
              aria-label="Search fabrics"
            />
          </label>
          <button className="add-button" onClick={() => navigate("/add")}>
            <span>＋</span> Add scrap
          </button>
        </div>

        <div className="filter-row" aria-label="Filter fabrics">
          {types.map((type) => (
            <button
              key={type}
              className={`filter-chip ${filter === type ? "active" : ""}`}
              onClick={() => setFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>

        {error && <p className="error-note">{error}</p>}
        {notice && <p className="success-note">{notice}</p>}

        <div className="collection-note">
          <span className="note-flower" aria-hidden="true">
            ✿
          </span>
          <p>
            <strong>Every little piece counts.</strong>
            <br />
            You might be one scrap away from your next favourite thing.
          </p>
        </div>

        <div className="scrap-grid">
          {filteredScraps.map((scrap) => (
            <ScrapCard key={scrap.id} scrap={scrap} favourited={favouriteIds.has(scrap.id)} onFavourite={toggleFavourite} onDelete={removeScrap} />
          ))}
        </div>

        {filteredScraps.length === 0 && (
          <div className="empty-state">
            <span>🧵</span>
            <h3>No scraps found just yet</h3>
            <p>Try another search, another fabric type, or add a new piece.</p>
          </div>
        )}

        <section className="bottom-promo gingham">
          <div className="promo-inner">
            <span className="eyebrow">A SMALL IDEA FOR TODAY</span>
            <h2>
              Little scraps.
              <br />
              Lovely creations.
            </h2>
            <p>Ready to see what your fabric can become?</p>
            <button className="primary-button" onClick={() => navigate("/make")}>
              Let's make something <span>♡</span>
            </button>
          </div>
        </section>
      </main>
    </>
  )
}
