// Frontend/src/screens/ProfileScreen.js
import React, { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { API_URL } from "../config"

export default function ProfileScreen({ employee = null, onBack, onSaveProfile, onLogout, onProfile }) {
  const ROLE = [
    { label: "Software Developer", value: "Software Developer" },
    { label: "Engagement Manager", value: "Engagement Manager" },
    { label: "Tech Lead", value: "Tech Lead" },
    { label: "Data Analyst", value: "Data Analyst" },
    { label: "Consulting - PLM", value: "Consulting - PLM" },
    { label: "Consulting - Manufacturing", value: "Consulting - Manufacturing" },
    { label: "Consulting - Aerospace", value: "Consulting - Aerospace" },
    { label: "Head of Bluebird", value: "Head of Bluebird" },
    { label: "Aerospace role", value: "Aerospace role" },
    { label: "Presentation role", value: "Presentation role" },
    { label: "Other", value: "Other" },
  ]

  const CLUSTER = [
    { label: "MEBM", value: "MEBM" },
    { label: "M&T", value: "M&T" },
    { label: "S&PS Insitu", value: "S&PS Insitu" },
    { label: "S&PS Exsitu", value: "S&PS Exsitu" },
  ]

  const [empid, setEmpid] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("")
  const [otherRole, setOtherRole] = useState("")
  const [cluster, setCluster] = useState("")
  const [location, setLocation] = useState("")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [touched, setTouched] = useState({})

  const originalIdRef = React.useRef(null)

  // responsive + navbar states
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900)
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Initialize from prop
  useEffect(() => {
    if (!employee) return
    const original = employee.empid || employee.id || ""
    originalIdRef.current = original

    setEmpid(original)
    setName(employee.name || "")
    setEmail(employee.email || "")
    setRole(employee.role || "")
    setOtherRole(employee.otherRole || employee.other_role || "")
    setCluster(employee.cluster || "")
    setLocation(employee.location || "")
  }, [employee])

  // Non-destructive background refresh (only fill empty local fields)
  useEffect(() => {
    const id = originalIdRef.current
    if (!id) return
    const url = `${API_URL.replace(/\/$/, "")}/api/employees/${encodeURIComponent(id)}`
      ; (async () => {
        try {
          const res = await fetch(url, { headers: { "Content-Type": "application/json" } })
          if (!res.ok) return
          const data = await res.json()
          const obj = Array.isArray(data) ? data[0] : data
          if (!obj) return

          setName((cur) => (cur ? cur : obj.name || ""))
          setEmail((cur) => (cur ? cur : obj.email || ""))
          setRole((cur) => (cur ? cur : obj.role || ""))
          setOtherRole((cur) => (cur ? cur : obj.otherRole || obj.other_role || ""))
          setCluster((cur) => (cur ? cur : obj.cluster || ""))
          setLocation((cur) => (cur ? cur : obj.location || ""))
        } catch (e) {
          console.warn("Profile refresh failed:", e)
        }
      })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee])

  // Validation
  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  const errors = {
    name: !name.trim() ? "Name is required" : "",
    empid: !empid.toString().trim() ? "Employee Id required" : "",
    email: !validateEmail(email) ? "Valid email required" : "",
    role: !role ? "Role required" : "",
    otherRole: role === "Other" && !otherRole.trim() ? "Enter role" : "",
    cluster: !cluster ? "Cluster required" : "",
  }
  const onBlurField = (k) => setTouched((t) => ({ ...t, [k]: true }))
  const isValid = () => !Object.values(errors).some(Boolean)

  // Read response utility
  const readResponse = async (res) => {
    const ct = res.headers.get("content-type") || ""
    try {
      if (ct.includes("application/json")) return await res.json()
      return await res.text()
    } catch {
      return "<unreadable response>"
    }
  }

  const fetchServerRecord = async (id) => {
    const base = API_URL.replace(/\/$/, "")
    const url = `${base}/api/employees/${encodeURIComponent(id)}`
    try {
      const r = await fetch(url, { headers: { "Content-Type": "application/json" } })
      if (r.ok) {
        const d = await r.json()
        return Array.isArray(d) ? d[0] : d
      }
    } catch (e) {
      // ignore and fallback
    }

    // fallback to fetch all and find
    try {
      const list = await fetch(`${base}/api/employees`, { headers: { "Content-Type": "application/json" } })
      if (!list.ok) return null
      const arr = await list.json()
      if (!Array.isArray(arr)) return null
      return arr.find((x) => ((x.empid || x.id) + "") === (id + "")) || null
    } catch (e) {
      return null
    }
  }

  const handleSave = async () => {
    setTouched({ name: true, empid: true, email: true, role: true, otherRole: true, cluster: true })
    setError("")

    if (!isValid()) return setError("Fix errors before saving.")

    const originalId = originalIdRef.current
    if (!originalId) return setError("Missing original employee ID.")

    setSaving(true)

    try {
      const payload = {
        name: name.trim(),
        empid: empid.toString().trim(),
        email: email.trim(),
        role: role === "Other" ? otherRole.trim() : role,
        otherRole: role === "Other" ? otherRole.trim() : "",
        cluster,
        location: location.trim(),
        updated_at: new Date().toISOString(),
      }

      const base = API_URL.replace(/\/$/, "")
      const target = `${base}/api/employees/${encodeURIComponent(originalId)}`

      // Try PATCH
      let res = await fetch(target, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      let body = await readResponse(res)
      console.log("[ProfileScreen] PATCH", res.status, body)

      if (!res.ok) {
        throw new Error(`Update failed with status ${res.status}`)
      }

      // Confirm by fetching server record (prefer new empid then original)
      let serverRecord = await fetchServerRecord(payload.empid)
      if (!serverRecord) serverRecord = await fetchServerRecord(originalId)
      if (!serverRecord) throw new Error("Could not fetch record after save — check backend.")

      // Build profile-only object using serverRecord fields (non-destructive)
      const profileKeys = ["empid", "name", "email", "role", "otherRole", "cluster", "location", "updated_at"]
      const profileOnly = {}
      for (const k of profileKeys) {
        profileOnly[k] =
          serverRecord[k] ?? serverRecord[k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase())] ?? ""
      }

      // Merge into sessionStorage safely (only profile keys)
      try {
        const existing = JSON.parse(sessionStorage.getItem("user") || "{}")
        sessionStorage.setItem("user", JSON.stringify({ ...existing, ...profileOnly }))
      } catch (e) {
        console.warn("sessionStorage merge failed:", e)
      }

      // Update state and notify parent
      setSaving(false)
      onSaveProfile && onSaveProfile(profileOnly)
      alert("Profile updated and confirmed on server.")
    } catch (err) {
      console.error("[ProfileScreen] Save error:", err)
      setError(err.message || "Save failed — check console/network")
      setSaving(false)
      alert(`Save failed: ${err.message}. See console/network tab.`)
    }
  }

  // ---------- NAVBAR & small helpers (copied & adapted from HomeScreen) ----------
  const getInitials = (nameStr) => {
    if (!nameStr) return "U"
    return nameStr
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
  }
  const getInitialsColor = (nm) => {
    const colors = ["#0072bc", "#d32f2f", "#2e7d32", "#f57c00", "#7b1fa2"]
    const n = (nm || " ").toString()
    let hash = 0
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const profileName = (employee && (employee.name || "")) || "User"
  const profileInitials = getInitials(profileName)
  const profileBg = getInitialsColor(profileName)

  useEffect(() => {
    function handleOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    function handleEsc(e) {
      if (e.key === "Escape") setProfileOpen(false)
    }
    document.addEventListener("mousedown", handleOutside)
    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("mousedown", handleOutside)
      document.removeEventListener("keydown", handleEsc)
    }
  }, [])

  // ---------- STYLES ----------
  const styles = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f4f7fb 0%, #ffffff 40%)", // modern soft gradient
      padding: isMobile ? "8px 12px" : "12px 20px",
      fontFamily: "Segoe UI, Tahoma, sans-serif",
    },
    navWrapper: {
      // removed extra padding around navbar (user requested)
      marginBottom: 18,
      // make navbar full-bleed and flush with page edges visually
      background: "linear-gradient(90deg, #016db9 0%, #0078d4 100%)",
      borderRadius: 10,
      boxShadow: "0 6px 18px rgba(3, 45, 85, 0.08)",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      color: "white",
      padding: isMobile ? "10px 16px" : "14px 20px", // internal navbar padding retained, outer padding removed
      borderRadius: 10,
    },
    title: { margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: "700", letterSpacing: "0.2px" },
    rightArea: { display: "flex", alignItems: "center", gap: "12px" },
    profileButton: {
      width: isMobile ? 40 : 48,
      height: isMobile ? 40 : 48,
      borderRadius: "50%",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      border: "2px solid rgba(255,255,255,0.12)",
      boxShadow: "0 2px 6px rgba(2,6,23,0.12)",
      userSelect: "none",
    },
    profileInitials: {
      color: "white",
      fontWeight: 800,
      fontSize: isMobile ? 13 : 15,
      lineHeight: 1,
    },
    profileMenu: {
      position: "absolute",
      right: 12,
      top: isMobile ? 54 : 64,
      background: "white",
      borderRadius: 8,
      boxShadow: "0 8px 28px rgba(2,6,23,0.12)",
      minWidth: 180,
      zIndex: 60,
      overflow: "hidden",
      border: "1px solid #e9eef6",
    },
    profileMenuItem: {
      padding: "10px 12px",
      cursor: "pointer",
      fontSize: 14,
      color: "#0b5fa5",
      display: "flex",
      alignItems: "center",
      gap: 8,
    },

    // profile card / form styles
    container: {
      maxWidth: 980,
      margin: "0 auto",
      padding: isMobile ? 16 : 28,
      fontFamily: "Segoe UI, Tahoma",
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 18px 48px rgba(12,36,72,0.08)",
    },
    headerRow: { display: "flex", alignItems: "center", marginBottom: 18, justifyContent: "space-between" },
    pageTitle: { fontSize: 22, fontWeight: 800, color: "#072a53" },
    backBtn: {
      padding: "8px 14px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
      background: "#f3f7fb",
      color: "#072a53",
      fontWeight: 700,
      boxShadow: "0 6px 20px rgba(3,45,85,0.04)",
    },
    formRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18 },
    field: { display: "flex", flexDirection: "column" },
    label: { fontSize: 13, marginBottom: 8, color: "#374151", fontWeight: 600 },
    input: {
      padding: 12,
      borderRadius: 10,
      border: "1px solid #e8eef6",
      background: "#fbfdff",
      fontSize: 15,
      outline: "none",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
    },
    select: { padding: 12, borderRadius: 10, border: "1px solid #e8eef6", background: "#fbfdff", fontSize: 15 },
    errorBox: { background: "#fff6f6", padding: 12, borderRadius: 8, color: "#b71c1c", marginBottom: 12 },
    actions: { display: "flex", justifyContent: "flex-end", marginTop: 20 },
    saveBtn: {
      padding: "12px 18px",
      borderRadius: 12,
      background: "linear-gradient(90deg,#0078d4,#005fa3)",
      color: "#fff",
      border: "none",
      cursor: "pointer",
      fontWeight: 800,
      boxShadow: "0 10px 30px rgba(3, 45, 85, 0.12)",
    },
  }

  return (
    <div style={styles.page}>
      {/* Navbar wrapper: outer padding removed as requested; internal header keeps consistent spacing */}
      <div style={styles.navWrapper}>
        <header style={styles.header}>
          {/* LOGO: top-left */}
          <img
            src="../../Logo/MainLogo.png"
            alt="Main Logo"
            style={{ height: isMobile ? 40 : 50, marginRight: 12, objectFit: "contain", background: "white", borderRadius: 4 }}
          />
          <h1 style={styles.title}>Profile</h1>
          <div style={styles.rightArea}>
            <div style={{ position: "relative" }} ref={profileRef}>
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  setProfileOpen((s) => !s)
                }}
                role="button"
                aria-haspopup="true"
                aria-expanded={profileOpen}
                style={{ ...styles.profileButton, background: profileBg }}
                title={profileName}
              >
                <span style={styles.profileInitials}>{profileInitials}</span>
              </div>

              {profileOpen && (
                <div style={styles.profileMenu} role="menu" aria-label="Profile menu">
                  <div
                    onClick={() => {
                      setProfileOpen(false)
                      onProfile && onProfile()
                      navigate("/profile")
                    }}
                    style={styles.profileMenuItem}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ width: 18, textAlign: "center" }}>👤</span>
                    <span>Profile</span>
                  </div>

                  <div
                    onClick={() => {
                      setProfileOpen(false)
                      navigate("/details")
                    }}
                    style={styles.profileMenuItem}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ width: 18, textAlign: "center" }}>📋</span>
                    <span>Details</span>
                  </div>

                  {/* <div
                    onClick={() => {
                      setProfileOpen(false)
                      onLogout && onLogout()
                    }}
                    style={styles.profileMenuItem}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ width: 18, textAlign: "center" }}>🔒</span>
                    <span>Logout</span>
                  </div> */}
                </div>
              )}
            </div>
          </div>
        </header>
      </div>

      {/* Hidden uploaded screenshot path (developer requested path) */}
      <img src="/mnt/data/5438abe0-f333-4e41-8233-b5ea2387a27d.png" alt="hidden" style={{ display: "none" }} />

      {/* Profile card */}
      <div style={styles.container} role="region" aria-label="Profile screen">
        <div style={styles.headerRow}>
          <div style={styles.pageTitle}>Profile</div>

          {/* Back moved to top-right inside card as requested */}
          <div>
            <button style={styles.backBtn} onClick={() => onBack && onBack()}>
              ← Back
            </button>
          </div>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <div style={styles.formRow}>
          <div style={styles.field}>
            <label style={styles.label}>Full Name</label>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => onBlurField("name")}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Employee ID</label>
            <input
              style={styles.input}
              value={empid}
              onChange={(e) => setEmpid(e.target.value)}
              onBlur={() => onBlurField("empid")}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => onBlurField("email")}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Role</label>
            <select style={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Select role</option>
              {ROLE.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {role === "Other" && (
            <div style={styles.field}>
              <label style={styles.label}>Specify Role</label>
              <input style={styles.input} value={otherRole} onChange={(e) => setOtherRole(e.target.value)} />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Cluster</label>
            <select style={styles.select} value={cluster} onChange={(e) => setCluster(e.target.value)}>
              <option value="">Select cluster</option>
              {CLUSTER.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Location</label>
            <input style={styles.input} value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>

        <div style={styles.actions}>
          <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  )
}
