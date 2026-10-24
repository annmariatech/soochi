import { useEffect, useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { currentUser, logout } from "../api"

const navigation = [
  { to: "/inventory", icon: "▧", label: "My scraps" },
  { to: "/make", icon: "✂", label: "Make things" },
  { to: "/nearby", icon: "⌖", label: "Near me" },
  { to: "/requests", icon: "♡", label: "Requests" },
  { to: "/profile", icon: "◉", label: "Profile" },
]

export default function Layout() {
  const navigate = useNavigate()
  const user = currentUser()
  const [theme, setTheme] = useState(() => localStorage.getItem("soochi_theme") || "light")

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem("soochi_theme", theme)
  }, [theme])

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="site-header">
        <button
          className="brand"
          onClick={() => navigate("/inventory")}
          aria-label="Soochi home"
        >
          <img className="brand-logo" src="/soochi-sustainable-logo.png" alt="" />
          <span>
            Soochi<span className="brand-dot">✳</span>
          </span>
        </button>

        <div className="header-actions">
          <span className="header-note">
            {user?.area_name ? `${user.area_name} · ` : ""}
            made of little things <span>♡</span>
          </span>
          <button
            className="text-button"
            onClick={() => {
              logout()
              navigate("/login")
            }}
          >
            Log out
          </button>
        </div>
      </header>

      <Outlet context={{ theme, setTheme }} />

      <nav className="bottom-nav" aria-label="Main navigation">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? "selected" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
