import { Navigate, useLocation } from "react-router-dom"
import { isLoggedIn } from "../api"

export default function RequireAuth({ children }) {
  const location = useLocation()
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

export function GuestOnly({ children }) {
  if (isLoggedIn()) return <Navigate to="/inventory" replace />
  return children
}
