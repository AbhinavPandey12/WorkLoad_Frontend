// src/App.js
import React, { useState } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom"
import LoginScreen from "./screens/LoginScreen"
import HomeScreen from "./screens/HomeScreen"
import ProfileScreen from "./screens/ProfileScreen"
import DetailScreen from "./screens/DetailScreen"
import DashboardPage from "./screens/DashboardPage"
import ResetPasswordScreen from "./screens/ResetPasswordScreen"

import ActivitiesScreen from "./screens/ActivitiesScreen"
import InlineActivitiesScreen from "./screens/InlineActivitiesScreen"

export default function App() {
  // initialize from sessionStorage so reload keeps logged-in user
  const initialUser = (() => {
    try {
      const raw = sessionStorage.getItem("user")
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })()

  const [user, setUser] = useState(initialUser)
  // console.log("[App] Current user state:", user);

  const handleLogin = (userData) => {
    try {
      sessionStorage.setItem("user", JSON.stringify(userData || {}))
    } catch (e) {
      // console.warn("sessionStorage write failed", e)
    }
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
    try {
      sessionStorage.removeItem("user")
    } catch { }
  }

  // Note: DO NOT call useNavigate() here at top-level of App.
  // Instead we'll define small wrapper components below and those wrappers will call useNavigate()
  // while being rendered inside <Router> so hooks are valid.

  // Merge-only-profile-keys helper (keeps details untouched)
  const mergeProfileIntoUser = (profileOnly) => {
    setUser((prev) => {
      const prevObj = prev || {}
      const merged = { ...prevObj, ...(profileOnly || {}) }
      try {
        const existing = JSON.parse(sessionStorage.getItem("user") || "{}")
        sessionStorage.setItem("user", JSON.stringify({ ...existing, ...(profileOnly || {}) }))
      } catch (e) {
        // console.warn("sessionStorage update failed:", e)
      }
      return merged
    })
  }

  // Render a Router and Routes. Any component that needs navigation will use a wrapper that calls useNavigate()
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={!user ? <LoginScreen onLogin={(u) => handleLogin(u)} /> : <Navigate to={(user.role_type || "").trim().toLowerCase() === "manager" ? "/dashboard" : "/details"} />}
        />

        {/* /dashboard route for Managers */}
        <Route
          path="/dashboard"
          element={
            user ? (
              (user.role_type || "").trim().toLowerCase() === "manager" ? <DashboardPage /> : <Navigate to="/details" />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* /home route - keeps previous UX where Profile is toggled inside home */}
        <Route
          path="/home"
          element={
            user ? (
              (user.role_type || "").trim().toLowerCase() === "manager" ? <HomeScreen onLogout={handleLogout} employee={user} /> : <Navigate to="/details" />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* Details route wrapper - useNavigate inside wrapper (valid because wrapper rendered inside Router) */}
        <Route
          path="/details"
          element={
            user ? <DetailsRoute user={user} mergeProfileIntoUser={mergeProfileIntoUser} setUser={setUser} onLogout={handleLogout} /> : <Navigate to="/" />
          }
        />

        {/* Profile route wrapper (route-based profile view) */}
        <Route
          path="/profile"
          element={user ? <ProfileRoute user={user} mergeProfileIntoUser={mergeProfileIntoUser} onLogout={handleLogout} /> : <Navigate to="/" />}
        />

        {/* Reset Password route wrapper */}
        <Route
          path="/reset-password"
          element={
            user ? <ResetPasswordRoute user={user} onLogout={handleLogout} /> : <Navigate to="/" />
          }
        />

        {/* Activities route wrapper (Manager only) */}
        <Route
          path="/activities"
          element={
            user ? (
              (user.role_type || "").trim().toLowerCase() === "manager" ? <ActivitiesScreen onLogout={handleLogout} /> : <Navigate to="/home" />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* Inline Activities route wrapper (User only) */}
        <Route
          path="/inline-activities"
          element={
            user ? <InlineActivitiesScreen onLogout={handleLogout} /> : <Navigate to="/" />
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

/* ----- Wrapper components (must be defined after default export or inside file) ----- */

/**
 * DetailsRoute
 * - Uses useNavigate safely (this component is rendered inside Router)
 * - onSaveDetails merges entire server details into user (details endpoint expected)
 */
function DetailsRoute({ user, mergeProfileIntoUser, setUser, onLogout }) {
  const navigate = useNavigate()

  const onSaveDetails = (serverRecord) => {
    // serverRecord likely contains details fields + maybe profile keys; merge whole record (details are allowed to update)
    setUser((prev) => ({ ...(prev || {}), ...(serverRecord || {}) }))
    try {
      const existing = JSON.parse(sessionStorage.getItem("user") || "{}")
      sessionStorage.setItem("user", JSON.stringify({ ...existing, ...(serverRecord || {}) }))
    } catch (e) {
      // console.warn("Failed to update sessionStorage after details save", e)
    }
    navigate("/home")
  }

  return <DetailScreen employee={user} onBack={() => navigate("/home")} onSaveDetails={onSaveDetails} onLogout={onLogout} />
}

/**
 * ProfileRoute
 * - Uses useNavigate safely
 * - onSaveProfile merges *only profile keys* returned from ProfileScreen
 */
function ProfileRoute({ user, mergeProfileIntoUser, onLogout }) {
  const navigate = useNavigate()

  const onSaveProfile = (profileOnly) => {
    mergeProfileIntoUser(profileOnly)
    navigate("/home")
  }

  return <ProfileScreen employee={user} onBack={() => navigate("/home")} onSaveProfile={onSaveProfile} onLogout={onLogout} />
}

/**
 * ResetPasswordRoute
 * - Uses useNavigate safely
 */
function ResetPasswordRoute({ user, onLogout }) {
  const navigate = useNavigate();
  return <ResetPasswordScreen user={user} onLogout={onLogout} />;
}
