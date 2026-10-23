import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import ScrapCard from "../components/ScrapCard"
import {
  createRequest,
  getMyScraps,
  getProducts,
  matchProductToScraps,
  matchScrapsToProducts,
} from "../api"
import { toCardScrap } from "../lib/scraps"

export default function MakePage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState("a")
  const [scraps, setScraps] = useState([])
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [custom, setCustom] = useState({
    name: "Scrunchie",
    w_cm: "45",
    h_cm: "12",
    qty: "1",
  })
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([getMyScraps(), getProducts()])
      .then(([mine, catalog]) => {
        setScraps(mine.map(toCardScrap))
        setProducts(catalog)
      })
      .catch((err) => setError(err.message))
  }, [])

  function toggle(id) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function runModeA() {
    if (!selected.length) {
      setError("Select at least one scrap from your basket.")
      return
    }
    setBusy(true)
    setError("")
    try {
      setSuggestions(await matchScrapsToProducts(selected))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function runModeB(event) {
    event.preventDefault()
    if (Number(custom.w_cm) <= 0 || Number(custom.h_cm) <= 0) {
      setError("Enter product width and height greater than zero.")
      return
    }
    setBusy(true)
    setError("")
    try {
      setResult(await matchProductToScraps(custom))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function requestScrap(scrapId) {
    setNotice("")
    try {
      await createRequest(scrapId)
      setNotice("Request sent. Watch the Requests tab for a reply.")
      navigate("/requests")
    } catch (err) {
      setError(err.message)
    }
  }

  function applyProduct(product) {
    const first = product.pieces[0]
    setCustom({
      name: product.name,
      w_cm: String(first.w_cm),
      h_cm: String(first.h_cm),
      qty: String(first.qty),
    })
  }

  return (
    <main className="page-main">
      <span className="eyebrow">YOUR NEXT LITTLE PROJECT</span>
      <h1 className="page-title">What shall we make?</h1>
      <p className="page-lead">
        Fit is calculated from centimetres, rotation, and leftover rectangles — not guessed.
      </p>

      <div className="mode-tabs" role="tablist">
        <button
          className={`filter-chip ${mode === "a" ? "active" : ""}`}
          onClick={() => setMode("a")}
        >
          Mode A · From my scraps
        </button>
        <button
          className={`filter-chip ${mode === "b" ? "active" : ""}`}
          onClick={() => setMode("b")}
        >
          Mode B · I have a project
        </button>
      </div>

      {error && <p className="error-note">{error}</p>}
      {notice && <p className="success-note">{notice}</p>}

      {mode === "a" ? (
        <>
          <p>Select scraps, then see which catalogue products they can cover.</p>
          <div className="scrap-grid">
            {scraps.map((scrap) => (
              <ScrapCard
                key={scrap.id}
                scrap={scrap}
                selectable
                selected={selected.includes(scrap.id)}
                onToggle={toggle}
              />
            ))}
          </div>
          {!scraps.length && (
            <p className="empty-copy">Your basket is empty. Add a scrap first.</p>
          )}
          <button className="primary-button" onClick={runModeA} disabled={busy}>
            {busy ? "Measuring…" : "See what I can make"}
          </button>

          <div className="result-list">
            {suggestions.map((item) => (
              <article
                key={item.product_id}
                className={`result-card ${item.verdict.suitable ? "is-yes" : "is-no"}`}
              >
                <div className="result-top">
                  <h3>{item.name}</h3>
                  <span className="tag">{item.size_label}</span>
                </div>
                <p>{item.verdict.reason}</p>
                <p className="fabric-type">{item.fabric_notes}</p>
                <div className="tag-row">
                  <span className="tag">{item.utilization_pct}% of selected area</span>
                  {item.pieces.map((piece, index) => (
                    <span className="tag" key={`${item.product_id}-${index}`}>
                      {piece.qty} × {piece.w_cm}×{piece.h_cm} cm
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <form className="add-step-card" onSubmit={runModeB}>
            <h2>Project size</h2>
            <p>Pick a catalogue item to fill the fields, or type your own dimensions.</p>
            <div className="filter-row">
              {products.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  className="filter-chip"
                  onClick={() => applyProduct(product)}
                >
                  {product.name}
                </button>
              ))}
            </div>
            <label>
              Product name
              <input
                value={custom.name}
                onChange={(event) => setCustom({ ...custom, name: event.target.value })}
              />
            </label>
            <div className="field-pair">
              <label>
                Width (cm)
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={custom.w_cm}
                  onChange={(event) => setCustom({ ...custom, w_cm: event.target.value })}
                />
              </label>
              <label>
                Height (cm)
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={custom.h_cm}
                  onChange={(event) => setCustom({ ...custom, h_cm: event.target.value })}
                />
              </label>
            </div>
            <label>
              Quantity
              <input
                type="number"
                min="1"
                step="1"
                value={custom.qty}
                onChange={(event) => setCustom({ ...custom, qty: event.target.value })}
              />
            </label>
            <button className="primary-button" disabled={busy}>
              {busy ? "Matching…" : "Find suitable scraps"}
            </button>
          </form>

          {result && (
            <>
              {result.shortage && (
                <div className="error-note">
                  <strong>Shortage.</strong> {result.shortage.message}
                </div>
              )}

              <h2 className="section-heading">From your basket</h2>
              <div className="result-list">
                {result.matches.map((item) => (
                  <article key={item.scrap.id} className="result-card is-yes">
                    <h3>{item.scrap.name}</h3>
                    <p>{item.verdict.reason}</p>
                    <span className="tag">{item.utilization_pct}% used</span>
                  </article>
                ))}
                {!result.matches.length && (
                  <p className="empty-copy">None of your scraps can complete this project alone.</p>
                )}
              </div>

              <h2 className="section-heading">Nearby makers</h2>
              <p className="page-lead">
                Distances use approximate areas only. Exact coordinates are never shown.
              </p>
              <div className="scrap-grid">
                {result.nearby.map((item) => (
                  <ScrapCard
                    key={item.scrap.id}
                    scrap={toCardScrap(item.scrap)}
                    extra={
                      <div className="nearby-meta">
                        <p>
                          {item.owner_area} · {item.distance_km} km
                        </p>
                        <p>{item.verdict.reason}</p>
                        <button
                          className="primary-button"
                          onClick={() => requestScrap(item.scrap.id)}
                        >
                          Request this scrap
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
              {!result.nearby.length && (
                <p className="empty-copy">No nearby scraps cover the missing piece.</p>
              )}
            </>
          )}
        </>
      )}
    </main>
  )
}
