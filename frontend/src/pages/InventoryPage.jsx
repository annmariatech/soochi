import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import ScrapCard from "../components/ScrapCard"
import { getMyScraps } from "../api"
import { toCardScrap } from "../lib/scraps"

export default function InventoryPage() {
  const navigate = useNavigate()
  const [scraps, setScraps] = useState([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getMyScraps()
      .then((items) => {
        if (active) setScraps(items.map(toCardScrap))
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
    return () => {
      active = false
    }
  }, [])

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

  return (
    <>
      <section className="hero-panel gingham">
        <div className="hero-paper">
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
          <span className="hero-doodle" aria-hidden="true">
            ✿
          </span>
          <span className="hero-sticker" aria-hidden="true">
            made
            <br />
            with ♡
          </span>
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
            <ScrapCard key={scrap.id} scrap={scrap} />
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
