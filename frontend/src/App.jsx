import { Navigate, Route, Routes } from "react-router-dom"
import Layout from "./components/Layout"
import RequireAuth, { GuestOnly } from "./components/RequireAuth"
import AddScrapPage from "./pages/AddScrapPage"
import InventoryPage from "./pages/InventoryPage"
import LoginPage from "./pages/LoginPage"
import MakePage from "./pages/MakePage"
import NearbyPage from "./pages/NearbyPage"
import RequestsPage from "./pages/RequestsPage"
import SignupPage from "./pages/SignupPage"
import ProfilePage from "./pages/ProfilePage"
import FavouritesPage from "./pages/FavouritesPage"
import "./App.css"

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestOnly>
            <SignupPage />
          </GuestOnly>
        }
      />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/inventory" replace />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/add" element={<AddScrapPage />} />
        <Route path="/make" element={<MakePage />} />
        <Route path="/nearby" element={<NearbyPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/favourites" element={<FavouritesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/inventory" replace />} />
    </Routes>
  )
}
