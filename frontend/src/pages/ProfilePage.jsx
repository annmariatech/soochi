import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { currentUser, getProfile, logout, updateProfile } from "../api"

export default function ProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(currentUser() || {})
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { getProfile().then(setProfile).catch((err) => setError(err.message)) }, [])

  async function save(event) {
    event.preventDefault()
    setSaving(true); setError(""); setNotice("")
    try {
      const updated = await updateProfile({ name: profile.name, area_name: profile.area_name })
      setProfile(updated); setNotice("Your profile has been saved.")
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
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
      <button className="text-button profile-logout" onClick={() => { logout(); navigate("/login") }}>Log out</button>
    </main>
  )
}
