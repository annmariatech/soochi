import { useEffect, useState } from "react"
import {
  getIncomingRequests,
  getOutgoingRequests,
  respondToRequest,
} from "../api"

function RequestCard({ item, incoming, onRespond, busyId }) {
  const scrap = item.scrap
  return (
    <article className={`result-card status-${item.status}`}>
      <div className="result-top">
        <h3>{scrap?.name || "Fabric scrap"}</h3>
        <span className="tag">{item.status}</span>
      </div>
      <p className="fabric-type">
        {scrap?.tags?.fabric_type} · {scrap?.width_cm} × {scrap?.height_cm} cm
      </p>
      {incoming ? (
        <p>
          {item.requester_name} in {item.requester_area} would like this piece.
        </p>
      ) : (
        <p>
          You asked {item.owner_name} in {item.owner_area}.
        </p>
      )}
      {item.status === "approved" && item.owner_contact ? (
        <p className="success-note">Owner contact: {item.owner_contact}</p>
      ) : (
        <p className="page-lead">
          Contact details appear only after the owner approves.
        </p>
      )}
      {incoming && item.status === "pending" && (
        <div className="request-actions">
          <button
            className="primary-button"
            disabled={busyId === item.id}
            onClick={() => onRespond(item.id, "approve")}
          >
            Approve
          </button>
          <button
            className="add-button"
            disabled={busyId === item.id}
            onClick={() => onRespond(item.id, "decline")}
          >
            Decline
          </button>
        </div>
      )}
    </article>
  )
}

export default function RequestsPage() {
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState(null)

  async function load() {
    const [inItems, outItems] = await Promise.all([
      getIncomingRequests(),
      getOutgoingRequests(),
    ])
    setIncoming(inItems)
    setOutgoing(outItems)
  }

  useEffect(() => {
    void (async () => {
      try {
        await load()
      } catch (err) {
        setError(err.message)
      }
    })()
  }, [])

  async function onRespond(id, action) {
    setBusyId(id)
    setError("")
    try {
      await respondToRequest(id, action)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="page-main">
      <span className="eyebrow">A LITTLE NOTE FROM A MAKER</span>
      <h1 className="page-title">Sharing is caring.</h1>
      {error && <p className="error-note">{error}</p>}

      <h2 className="section-heading">Incoming</h2>
      <div className="result-list">
        {incoming.map((item) => (
          <RequestCard
            key={item.id}
            item={item}
            incoming
            onRespond={onRespond}
            busyId={busyId}
          />
        ))}
        {!incoming.length && <p className="empty-copy">No one has asked for your scraps yet.</p>}
      </div>

      <h2 className="section-heading">Outgoing</h2>
      <div className="result-list">
        {outgoing.map((item) => (
          <RequestCard key={item.id} item={item} incoming={false} />
        ))}
        {!outgoing.length && <p className="empty-copy">You have not requested any nearby scraps.</p>}
      </div>
    </main>
  )
}
