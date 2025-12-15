import React, { useState } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { ToastContainer } from "react-toastify";
import LoginScreen from "./screens/LoginScreen"
import HomeScreen from "./screens/HomeScreen"
import ProfileScreen from "./screens/ProfileScreen"
import DetailScreen from "./screens/DetailScreen"
import DashboardPage from "./screens/DashboardPage"
import ResetPasswordScreen from "./screens/ResetPasswordScreen"

import ActivitiesScreen from "./screens/ActivitiesScreen"
import InlineActivitiesScreen from "./screens/InlineActivitiesScreen"

import PWAInstallPopup from "./components/PWAInstallPopup"
import NotificationPermissionPopup from "./components/NotificationPermissionPopup"
import { subscribeToPush } from "./utils/notification"

export default function App() {
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPopup, setShowInstallPopup] = useState(false);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      // Only show if user is logged in (checked in render)
      // We can also check if it's already installed via other means, but this event only fires if installable
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallPopup(false);
    checkNotificationPermission();
  };

  const handleClosePopup = () => {
    setShowInstallPopup(false);
    checkNotificationPermission();
  };

  // Notification Popup State
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  // Check notification permission queue
  const checkNotificationPermission = () => {
    if (!user) return;

    // Check if supported first
    if (!('Notification' in window)) return;

    // Check if already granted or denied
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;

    // Check if we already showed it and user cancelled (using localStorage to persist across refreshes if needed, 
    // but user said "once accepted... should not appear". Implicitly if cancelled, it might appear again next login? 
    // User said "shows option... Cancel... once accepted... should not appear". 
    // Usually "Cancel" means "Not now", so it might show again. 
    // "Accepted" means permission 'granted'.

    // Double check we are not already showing it
    if (showNotificationPopup) return;

    setShowNotificationPopup(true);
  }

  const handleEnableNotifications = async () => {
    if (user && user.empid) {
      await subscribeToPush(user.empid);
      setShowNotificationPopup(false);
    }
  }

  const handleCancelNotifications = () => {
    setShowNotificationPopup(false);
  }

  // Check if we should show the popup
  // Show if:
  // 1. We have a deferred prompt (browser says it's installable)
  // 2. User is logged in (user state is not null)
  // 3. We haven't explicitly closed it (showInstallPopup state - though we need to init this effectively)

  // Actually, let's sync showInstallPopup with deferredPrompt presence initially?
  // Or just use a separate effect.



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

  React.useEffect(() => {
    if (deferredPrompt && user) {
      setShowInstallPopup(true);
    } else if (user) {
      // If no install prompt needed (already installed or not supported), check notification immediately
      // But wait a tick to ensure install prompt effect didn't just fire
      const t = setTimeout(() => {
        if (!showInstallPopup) checkNotificationPermission();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [deferredPrompt, user, showInstallPopup]);

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

        {/* --- Protected Routes --- */}

        {/* Dashboard: Managers Only */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user} requiredRole="manager" fallback="/details">
              <DashboardPage onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* Employee Directory: Managers Only (Employees redirect to details) */}
        <Route
          path="/home"
          element={
            <ProtectedRoute user={user} requiredRole="manager" fallback="/details">
              <HomeScreen onLogout={handleLogout} employee={user} />
            </ProtectedRoute>
          }
        />

        {/* Details: Accessible to All (Employees land here, Managers can view too? Logic says NO usually, but let's see) 
            Original logic for /details: 
            user ? <DetailsRoute ... /> : <Navigate to="/" />
            It didn't restrict role. So both can view?
        */}
        <Route
          path="/details"
          element={
            <ProtectedRoute user={user}>
              <DetailsRoute user={user} mergeProfileIntoUser={mergeProfileIntoUser} setUser={setUser} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* Profile: Accessible to All */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user}>
              <ProfileRoute user={user} mergeProfileIntoUser={mergeProfileIntoUser} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* Reset Password: Accessible to All */}
        <Route
          path="/reset-password"
          element={
            <ProtectedRoute user={user}>
              <ResetPasswordRoute user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* Activities: Managers Only */}
        <Route
          path="/activities"
          element={
            <ProtectedRoute user={user} requiredRole="manager" fallback="/home">
              <ActivitiesScreen onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* Inline Activities: Accessible to All? 
            Original logic: user ? <InlineActivitiesScreen ... /> : /
            It didn't restrict role.
        */}
        <Route
          path="/inline-activities"
          element={
            <ProtectedRoute user={user}>
              <InlineActivitiesScreen onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {
        showInstallPopup && (
          <PWAInstallPopup
            onInstall={handleInstallClick}
            onClose={handleClosePopup}
          />
        )
      }
      {
        showNotificationPopup && !showInstallPopup && (
          <NotificationPermissionPopup
            onEnable={handleEnableNotifications}
            onCancel={handleCancelNotifications}
          />
        )
      }
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </Router >
  )
}

/* ----- Wrapper components ----- */

/**
 * ProtectedRoute Wrapper
 * Enforces login and optional role check.
 */
function ProtectedRoute({ user, requiredRole, children, fallback }) {
  if (!user) {
    return <Navigate to="/" replace />
  }

  if (requiredRole) {
    const userRole = (user.role_type || "").trim().toLowerCase()
    const targetRole = requiredRole.toLowerCase()
    if (userRole !== targetRole) {
      return <Navigate to={fallback || "/"} replace />
    }
  }

  return children
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
    navigate("/inline-activities")
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
    navigate("/inline-activities")
  }

  return <ProfileScreen employee={user} onBack={() => navigate("/home")} onSaveProfile={onSaveProfile} onLogout={onLogout} />
}

/**
 * ResetPasswordRoute
 * - Uses useNavigate safely
 */
function ResetPasswordRoute({ user, onLogout }) {
  return <ResetPasswordScreen user={user} onLogout={onLogout} />;
}
