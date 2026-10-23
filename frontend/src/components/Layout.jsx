import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { currentUser, logout } from "../api"

const navigation = [
  { to: "/inventory", icon: "▧", label: "My scraps" },
  { to: "/make", icon: "✂", label: "Make things" },
  { to: "/nearby", icon: "⌖", label: "Near me" },
  { to: "/requests", icon: "♡", label: "Requests" },
  { to: "/favourites", icon: "♥", label: "Favourites" },
  { to: "/profile", icon: "◉", label: "Profile" },
]

export default function Layout() {
  const navigate = useNavigate()
  const user = currentUser()

  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="brand"
          onClick={() => navigate("/inventory")}
          aria-label="Soochi home"
        >
          <span className="brand-mark">s.</span>
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

      <Outlet />

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
