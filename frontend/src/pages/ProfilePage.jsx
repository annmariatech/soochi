import { useEffect, useState } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import ScrapCard from "../components/ScrapCard"
import { currentUser, getFavourites, getProfile, logout, setFavourite, updateProfile } from "../api"
import { toCardScrap } from "../lib/scraps"

export default function ProfilePage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useOutletContext()
  const [profile, setProfile] = useState(currentUser() || {})
  const [favourites, setFavourites] = useState([])
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { getProfile().then(setProfile).catch((err) => setError(err.message)) }, [])
  useEffect(() => { getFavourites().then(setFavourites).catch((err) => setError(err.message)) }, [])

  async function save(event) {
    event.preventDefault()
    setSaving(true); setError(""); setNotice("")
    try {
      const updated = await updateProfile({ name: profile.name, area_name: profile.area_name })
      setProfile(updated); setNotice("Your profile has been saved.")
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function removeFavourite(id) {
    try {
      await setFavourite(id, false)
      setFavourites((items) => items.filter((scrap) => scrap.id !== id))
    } catch (err) { setError(err.message) }
  }

  return (
    <main className="page-main profile-page">
      <span className="eyebrow">YOUR SOOCHI SPACE</span>
      <h1 className="page-title">Your profile</h1>
      <p className="page-lead">Manage your maker details and neighborhood.</p>
      {error && <p className="error-note">{error}</p>}
      {notice && <p className="success-note">{notice}</p>}
      <form className="add-step-card profile-form" onSubmit={save}>
        <label>Name<input value={profile.name || ""} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /></label>
        <label>Email or phone<input value={profile.contact || ""} readOnly /></label>
        <label>Neighborhood<input value={profile.area_name || ""} onChange={(event) => setProfile({ ...profile, area_name: event.target.value })} required /></label>
        <p className="map-caption">Your exact coordinates are only used locally to calculate distances. Other makers see an approximate neighborhood.</p>
        <button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
      </form>
      <section className="profile-preferences add-step-card">
        <div>
          <h2>Appearance</h2>
          <p>Choose the Soochi look that feels right for you.</p>
        </div>
        <button
          className="add-button theme-toggle"
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☀ Use light mode" : "☾ Use dark mode"}
        </button>
      </section>
      <section className="profile-favourites" id="favourites">
        <span className="eyebrow">SAVED FOR LATER</span>
        <h2 className="section-heading">Your favourites</h2>
        <p className="page-lead">Keep lovely scraps close while you plan your next make.</p>
        <div className="scrap-grid">
          {favourites.map((scrap) => (
            <ScrapCard key={scrap.id} scrap={toCardScrap(scrap)} favourited onFavourite={removeFavourite} />
          ))}
        </div>
        {!favourites.length && <div className="empty-state"><img className="favourites-empty-art" src="/stitched-hearts.jpg" alt="Two pink stitched heart patches" /><h3>No favourites yet</h3><p>Tap the heart on any scrap to save it here.</p></div>}
      </section>
      <button className="text-button profile-logout" onClick={() => { logout(); navigate("/login") }}>Log out</button>
    </main>
  )
}
