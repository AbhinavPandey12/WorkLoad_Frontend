// Frontend/src/screens/ProfileScreen.js
import React, { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
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

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [touched, setTouched] = useState({})

  const originalIdRef = React.useRef(null)

  // responsive + navbar states
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false)
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
        } catch (e) {
          console.warn("Profile refresh failed:", e)
        }
      })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee])

  // Validation
  const validateEmail = (v) => /^[a-zA-Z0-9]+\.[a-zA-Z0-9]+@tatatechnologies\.com$/i.test(v)
  const errors = {
    name: !name.trim() ? "Name is required" : "",
    empid: !empid.toString().trim() ? "Employee Id required" : "",
    email: !validateEmail(email) ? "Email format Incorrect" : "",
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
      const profileKeys = ["empid", "name", "email", "role", "otherRole", "cluster", "updated_at"]
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



  // ---------- STYLES ----------
  const styles = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f4f7fb 0%, #ffffff 40%)", // modern soft gradient
      padding: isMobile ? "8px 12px" : "12px 20px",
      fontFamily: "Segoe UI, Tahoma, sans-serif",
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
      <Navbar user={employee} onLogout={onLogout} title="Profile" />

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
