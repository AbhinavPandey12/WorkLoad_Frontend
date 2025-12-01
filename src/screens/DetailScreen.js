// Frontend/src/screens/DetailScreen.js
import React, { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import { API_URL } from "../config"

export default function DetailScreen({ employee = null, onBack, onSaveDetails, onLogout, onProfile }) {
  // detail fields (unchanged semantics)
  const [currentProject, setCurrentProject] = useState("")
  const [noCurrentProject, setNoCurrentProject] = useState(false)
  const [availability, setAvailability] = useState("Occupied")
  const [hoursAvailable, setHoursAvailable] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  // Skills / Interests / Previous projects as arrays (tag-style)
  const [skills, setSkills] = useState([])
  const [interests, setInterests] = useState([]) // array of strings
  const [previousProjects, setPreviousProjects] = useState([]) // array of strings

  const [loading, setLoading] = useState(false)
  const [saving, setSavingState] = useState(false)
  const [error, setError] = useState("")

  // date-specific validation error messages
  const [dateError, setDateError] = useState("")

  // responsive + navbar states
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false)
  const navigate = useNavigate()

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900)
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // helper to parse list-like values (SheetDB often returns strings, arrays, or keyed objects)
  const parseListField = (val) => {
    if (!val && val !== 0) return []
    if (Array.isArray(val)) return val.filter(Boolean)
    if (typeof val === "object" && val !== null) {
      try {
        return Object.values(val).flat().filter(Boolean)
      } catch {
        return []
      }
    }
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val)
        if (Array.isArray(parsed)) return parsed.filter(Boolean)
      } catch { }
      const sep = val.includes(",") ? "," : val.includes(";") ? ";" : null
      if (sep) return val.split(sep).map((s) => s.trim()).filter(Boolean)
      if (val.includes("\n")) return val.split("\n").map((s) => s.trim()).filter(Boolean)
      return val.trim() ? [val.trim()] : []
    }
    return []
  }

  // ---------- date helpers ----------
  const todayISO = () => {
    const t = new Date()
    const y = t.getFullYear()
    const m = String(t.getMonth() + 1).padStart(2, "0")
    const d = String(t.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  // convert yyyy-mm-dd to Date (midnight)
  const isoToDate = (iso) => {
    if (!iso) return null
    const parts = iso.split("-").map((p) => parseInt(p, 10))
    if (parts.length !== 3 || parts.some(isNaN)) return null
    return new Date(parts[0], parts[1] - 1, parts[2])
  }

  const isWeekend = (isoDate) => {
    const d = isoToDate(isoDate)
    if (!d) return false
    const day = d.getDay()
    return day === 0 || day === 6 // Sunday=0, Saturday=6
  }

  const daysBetween = (aIso, bIso) => {
    const a = isoToDate(aIso)
    const b = isoToDate(bIso)
    if (!a || !b) return null
    const diffMs = Math.abs(b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0))
    return Math.round(diffMs / (1000 * 60 * 60 * 24))
  }

  const maxSeparationDays = 365

  // ---------- END date helpers ----------

  // populate detail fields from employee prop
  useEffect(() => {
    if (!employee) return
    const cp = employee.current_project || employee.currentProject || ""
    setCurrentProject(cp)
    setNoCurrentProject(!cp)

    let av = employee.availability || "Occupied"
    // Expiry check
    if ((av === "Partially Available" || av.toLowerCase().includes("partial")) && (employee.to_date || employee.toDate)) {
      try {
        const dStr = employee.to_date ? employee.to_date.split("T")[0] : employee.toDate
        const parts = dStr.split("-").map(p => parseInt(p, 10))
        const toDateObj = new Date(parts[0], parts[1] - 1, parts[2])
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (toDateObj < today) {
          av = "Occupied"
        }
      } catch (e) { }
    }
    setAvailability(av)

    setHoursAvailable(employee.hours_available || employee.hoursAvailable || "")
    setFromDate(employee.from_date ? (employee.from_date.split("T")[0]) : (employee.fromDate || ""))
    setToDate(employee.to_date ? (employee.to_date.split("T")[0]) : (employee.toDate || ""))
    setSkills(parseListField(employee.current_skills))
    setInterests(parseListField(employee.interests))
    setPreviousProjects(parseListField(employee.previous_projects))
  }, [employee])

  // background refresh from API if empid present (unchanged)
  useEffect(() => {
    if (!employee || !employee.empid) return
    const id = employee.empid
    const url = `${API_URL.replace(/\/$/, "")}/api/employees/${encodeURIComponent(id)}`
      ; (async () => {
        try {
          const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } })
          if (!res.ok) return
          const data = await res.json()
          const obj = Array.isArray(data) ? data[0] || data : data
          if (!obj) return
          // update only detail fields if local ones are empty to avoid clobbering edits
          setCurrentProject((cur) => (cur ? cur : obj.current_project || obj.currentProject || ""))
          setNoCurrentProject((cur) => (cur ? cur : !(obj.current_project || obj.currentProject || "")))

          setAvailability((cur) => {
            if (cur) return cur
            let av = obj.availability || "Occupied"
            // Expiry check
            if ((av === "Partially Available" || av.toLowerCase().includes("partial")) && (obj.to_date || obj.toDate)) {
              try {
                const dStr = obj.to_date ? obj.to_date.split("T")[0] : obj.toDate
                const parts = dStr.split("-").map(p => parseInt(p, 10))
                const toDateObj = new Date(parts[0], parts[1] - 1, parts[2])
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                if (toDateObj < today) {
                  av = "Occupied"
                }
              } catch (e) { }
            }
            return av
          })
          setHoursAvailable((cur) => (cur ? cur : (obj.hours_available || obj.hoursAvailable || "")))
          setFromDate((cur) => (cur ? cur : (obj.from_date ? obj.from_date.split("T")[0] : (obj.fromDate || ""))))
          setToDate((cur) => (cur ? cur : (obj.to_date ? obj.to_date.split("T")[0] : (obj.toDate || ""))))
          setSkills((cur) => (cur && cur.length ? cur : parseListField(obj.current_skills)))
          setInterests((cur) => (cur && cur.length ? cur : parseListField(obj.interests)))
          setPreviousProjects((cur) => (cur && cur.length ? cur : parseListField(obj.previous_projects)))
        } catch (e) {
          console.warn("DetailScreen background refresh failed:", e)
        }
      })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee && employee.empid])

  // validation
  const errors = {
    hours: (!noCurrentProject && availability === "Partially Available" && (!hoursAvailable || isNaN(Number(hoursAvailable)))) ? "Specify hours" : "",
    fromDate: (!noCurrentProject && availability === "Partially Available" && !fromDate) ? "From date required" : "",
    toDate: (!noCurrentProject && availability === "Partially Available" && !toDate) ? "To date required" : "",
  }
  const isValid = () => !Object.values(errors).some(Boolean) && !dateError

  // response reader
  const readResponse = async (res) => {
    const ct = res.headers.get("content-type") || ""
    try {
      if (ct.includes("application/json")) return await res.json()
      return await res.text()
    } catch {
      return "<unreadable response>"
    }
  }

  // fetch server record by empid (confirm)
  const fetchServerRecord = async (id) => {
    const url = `${API_URL.replace(/\/$/, "")}/api/employees/${encodeURIComponent(id)}`
    const r = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } })
    if (!r.ok) {
      const listUrl = `${API_URL.replace(/\/$/, "")}/api/employees`
      const lr = await fetch(listUrl, { method: "GET", headers: { "Content-Type": "application/json" } })
      if (!lr.ok) throw new Error(`Failed to fetch record for confirmation (list fetch status ${lr.status})`)
      const arr = await lr.json()
      if (!Array.isArray(arr)) throw new Error("Unexpected list format when confirming save")
      return arr.find((x) => ((x.empid || x.id) + "").toString() === (id + "").toString()) || null
    }
    const data = await r.json()
    return Array.isArray(data) ? data[0] || data : data
  }

  // ---------- date change handlers with validations ----------
  const handleFromDateChange = (iso) => {
    setDateError("")
    if (!iso) {
      setFromDate("")
      return
    }

    // from must be >= today
    const today = todayISO()
    if (isoToDate(iso) < isoToDate(today)) {
      setDateError("From date cannot be earlier than today.")
      return
    }

    // no weekends
    if (isWeekend(iso)) {
      setDateError("From date cannot be a Saturday or Sunday.")
      return
    }

    // if toDate exists, ensure from <= to
    if (toDate) {
      if (isoToDate(iso) > isoToDate(toDate)) {
        setDateError("From date cannot be after To date.")
        return
      }

      const diff = daysBetween(iso, toDate)
      if (diff !== null && diff > maxSeparationDays) {
        setDateError("Separation between From and To cannot exceed 1 year.")
        return
      }
    }

    setFromDate(iso)
    setDateError("")
  }

  const handleToDateChange = (iso) => {
    setDateError("")
    if (!iso) {
      setToDate("")
      return
    }

    // no weekends
    if (isWeekend(iso)) {
      setDateError("To date cannot be a Saturday or Sunday.")
      return
    }

    // if fromDate exists, ensure to >= from
    if (fromDate) {
      if (isoToDate(iso) < isoToDate(fromDate)) {
        setDateError("To date cannot be earlier than From date.")
        return
      }

      const diff = daysBetween(fromDate, iso)
      if (diff !== null && diff > maxSeparationDays) {
        setDateError("Separation between From and To cannot exceed 1 year.")
        return
      }
    } else {
      // if fromDate not set, ensure toDate is >= today
      const today = todayISO()
      if (isoToDate(iso) < isoToDate(today)) {
        setDateError("To date cannot be earlier than today.")
        return
      }
    }

    setToDate(iso)
    setDateError("")
  }

  // ---------- END date handlers ----------

  // Save details: write only detail fields, confirm by GET
  const handleSave = async () => {
    setError("")
    if (!employee || !employee.empid) {
      setError("Missing empid — cannot save to server.")
      return
    }

    const effectiveAvailability = noCurrentProject ? "Available" : availability

    if (effectiveAvailability === "Partially Available") {
      if (!isValid()) {
        setError("Please fix validation errors before saving.")
        return
      }
    }

    if (!noCurrentProject && effectiveAvailability === "Available") {
      setError("You cannot be 'Available' if you have a current project. Please select 'Occupied' or 'Partially Available'.")
      return
    }

    setSavingState(true)
    try {
      // prepare payload: only detail fields
      const payload = {
        current_project: noCurrentProject ? "" : (currentProject || ""),
        availability: effectiveAvailability,
        hours_available: effectiveAvailability === "Partially Available" ? Number(hoursAvailable) : null,
        from_date: effectiveAvailability === "Partially Available" ? (fromDate || null) : null,
        to_date: effectiveAvailability === "Partially Available" ? (toDate || null) : null,
        current_skills: skills && skills.length ? skills : [],
        interests: interests && interests.length ? interests : [],
        previous_projects: previousProjects && previousProjects.length ? previousProjects : [],
        updated_at: new Date().toISOString(),
      }

      // remove undefined keys (but allow empty arrays/strings passed intentionally)
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

      const base = API_URL.replace(/\/$/, "")
      const id = employee.empid
      const target = `${base}/api/employees/${encodeURIComponent(id)}`


      // Try PUT
      let res = await fetch(target, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      let body = await readResponse(res)


      // PATCH fallback
      if (!res.ok) {
        console.warn("[DetailScreen] PUT failed; trying PATCH")
        res = await fetch(target, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        body = await readResponse(res)

      }

      // POST fallback
      if (!res.ok) {
        console.warn("[DetailScreen] PATCH failed; trying POST to collection endpoint")
        const postRes = await fetch(`${base}/api/employees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ empid: id, ...payload }),
        })
        const postBody = await readResponse(postRes)

        if (!postRes.ok) {
          throw new Error(`All update attempts failed. Last status: ${postRes.status}. Body: ${JSON.stringify(postBody)}`)
        }
      }

      // Confirm by fetching record
      const serverRecord = await fetchServerRecord(id)
      if (!serverRecord) throw new Error("Could not fetch record after save — check backend.")

      // Update sessionStorage (merge details only)
      try {
        const existing = JSON.parse(sessionStorage.getItem("user") || "{}")
        // Merge only detail keys into cached user
        const merged = {
          ...existing,
          current_project: serverRecord.current_project ?? serverRecord.currentProject ?? "",
          availability: serverRecord.availability ?? "",
          hours_available: serverRecord.hours_available ?? serverRecord.hoursAvailable ?? null,
          from_date: serverRecord.from_date ?? serverRecord.fromDate ?? null,
          to_date: serverRecord.to_date ?? serverRecord.toDate ?? null,
          current_skills: serverRecord.current_skills ?? serverRecord.currentSkills ?? [],
          interests: serverRecord.interests ?? [],
          previous_projects: serverRecord.previous_projects ?? serverRecord.previousProjects ?? [],
          updated_at: serverRecord.updated_at ?? new Date().toISOString(),
        }
        sessionStorage.setItem("user", JSON.stringify(merged))
      } catch (e) {
        console.warn("sessionStorage merge failed:", e)
      }

      onSaveDetails && onSaveDetails(serverRecord)
      alert("Details saved and confirmed on server.")
    } catch (err) {
      console.error("[DetailScreen] Save error:", err)
      setError(err.message || "Save failed — check console/network")
      alert(`Save failed: ${err.message}. See console/network tab.`)
    } finally {
      setSavingState(false)
    }
  }

  // helpers for tags UI
  const addSkill = (s) => {
    if (!s) return
    if (!skills.includes(s)) setSkills((prev) => [...prev, s])
  }
  const removeSkill = (s) => setSkills((prev) => prev.filter((x) => x !== s))

  const addInterest = (i) => {
    if (!i) return
    if (!interests.includes(i)) setInterests((prev) => [...prev, i])
  }
  const removeInterest = (i) => setInterests((prev) => prev.filter((x) => x !== i))

  const addPrevious = (p) => {
    if (!p) return
    if (!previousProjects.includes(p)) setPreviousProjects((prev) => [...prev, p])
  }
  const removePrevious = (p) => setPreviousProjects((prev) => prev.filter((x) => x !== p))

  // ---------- NAVBAR helpers ----------


  // ---------- STYLES (Modern & Industry Standard) ----------
  const theme = {
    primary: "#0f172a", // Slate 900
    secondary: "#334155", // Slate 700
    accent: "#2563eb", // Blue 600
    accentHover: "#1d4ed8", // Blue 700
    bg: "#f8fafc", // Slate 50
    cardBg: "#ffffff",
    border: "#e2e8f0", // Slate 200
    text: "#1e293b", // Slate 800
    textMuted: "#64748b", // Slate 500
    danger: "#ef4444", // Red 500
    success: "#22c55e", // Green 500
    warning: "#f59e0b", // Amber 500
  }

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f1f5f9", // Slightly darker for better contrast
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      paddingBottom: "80px", // More space for fixed footer
    },
    navContainer: {
      background: "white",
      borderBottom: `1px solid ${theme.border}`,
      padding: "0", // Removed padding for full width
      marginBottom: "40px",
      position: "sticky",
      top: 0,
      zIndex: 200,
    },
    mainContainer: {
      maxWidth: "1280px", // Wider for laptop
      margin: "0 auto",
      padding: isMobile ? "0 16px" : "0 40px",
    },
    header: {
      marginBottom: "32px",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isMobile ? "flex-start" : "center",
      gap: "16px",
    },
    titleGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    pageTitle: {
      fontSize: "28px", // Larger title
      fontWeight: "800",
      color: theme.primary,
      margin: 0,
      letterSpacing: "-0.5px",
    },
    pageSubtitle: {
      fontSize: "15px",
      color: theme.textMuted,
      fontWeight: "500",
    },
    backBtn: {
      padding: "10px 20px",
      borderRadius: "10px",
      border: `1px solid ${theme.border}`,
      background: "white",
      color: theme.secondary,
      fontWeight: "600",
      fontSize: "14px",
      cursor: "pointer",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", // Wider left column
      gap: "32px", // More gap
      alignItems: "start",
    },
    card: {
      background: theme.cardBg,
      borderRadius: "20px", // Softer corners
      border: `1px solid ${theme.border}`,
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", // Better shadow
      padding: "32px", // More padding
      display: "flex",
      flexDirection: "column",
      gap: "28px",
    },
    sectionTitle: {
      fontSize: "18px",
      fontWeight: "700",
      color: theme.primary,
      marginBottom: "20px",
      borderBottom: `1px solid ${theme.border}`,
      paddingBottom: "16px",
      letterSpacing: "-0.3px",
    },
    fieldGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    label: {
      fontSize: "14px",
      fontWeight: "600",
      color: theme.secondary,
      marginBottom: "4px",
    },
    input: {
      padding: "12px 16px", // Larger touch target
      borderRadius: "10px",
      border: `1px solid ${theme.border}`,
      fontSize: "15px",
      color: theme.text,
      outline: "none",
      transition: "all 0.2s ease",
      width: "100%",
      boxSizing: "border-box",
      background: "#f8fafc",
    },
    select: {
      padding: "12px 16px",
      borderRadius: "10px",
      border: `1px solid ${theme.border}`,
      fontSize: "15px",
      color: theme.text,
      outline: "none",
      width: "100%",
      backgroundColor: "#f8fafc",
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
    checkboxWrapper: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      cursor: "pointer",
      userSelect: "none",
      padding: "4px 0",
    },
    checkbox: {
      width: "18px",
      height: "18px",
      cursor: "pointer",
      accentColor: theme.accent,
    },
    checkboxLabel: {
      fontSize: "14px",
      color: theme.secondary,
      fontWeight: "500",
    },
    helperText: {
      fontSize: "13px",
      color: theme.textMuted,
      marginTop: "6px",
      lineHeight: "1.4",
    },
    errorText: {
      fontSize: "13px",
      color: theme.danger,
      marginTop: "6px",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    warningBox: {
      background: "#fffbeb",
      border: "1px solid #fcd34d",
      color: "#92400e",
      padding: "16px",
      borderRadius: "12px",
      fontSize: "14px",
      marginTop: "12px",
      lineHeight: "1.5",
    },
    tagInputContainer: {
      display: "flex",
      gap: "10px",
      marginBottom: "16px",
    },
    addBtn: {
      padding: "0 20px",
      borderRadius: "10px",
      background: theme.bg,
      border: `1px solid ${theme.border}`,
      color: theme.accent,
      fontWeight: "600",
      fontSize: "14px",
      cursor: "pointer",
      transition: "all 0.2s",
      whiteSpace: "nowrap",
    },
    tagsWrapper: {
      display: "flex",
      flexWrap: "wrap",
      gap: "10px",
    },
    tag: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 14px",
      borderRadius: "999px",
      background: "#eff6ff",
      color: theme.accent,
      fontSize: "14px",
      fontWeight: "500",
      border: "1px solid #dbeafe",
      transition: "all 0.2s",
    },
    removeTagBtn: {
      border: "none",
      background: "transparent",
      color: theme.accent,
      cursor: "pointer",
      padding: "2px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
      opacity: 0.6,
      transition: "opacity 0.2s",
    },
    saveBar: {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(10px)",
      border: `1px solid ${theme.border}`,
      padding: "12px 24px",
      display: "flex",
      justifyContent: "center",
      gap: "16px",
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      zIndex: 100,
      borderRadius: "16px",
      width: "auto",
      minWidth: "300px",
    },
    saveBtn: {
      padding: "12px 32px",
      borderRadius: "12px",
      background: theme.accent,
      color: "white",
      border: "none",
      fontWeight: "600",
      fontSize: "15px",
      cursor: "pointer",
      boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
      transition: "all 0.2s",
      opacity: saving ? 0.7 : 1,
    },
    cancelBtn: {
      padding: "12px 32px",
      borderRadius: "12px",
      background: "white",
      color: theme.secondary,
      border: `1px solid ${theme.border}`,
      fontWeight: "600",
      fontSize: "15px",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    globalError: {
      background: "#fef2f2",
      border: `1px solid #fecaca`,
      color: "#991b1b",
      padding: "16px",
      borderRadius: "12px",
      marginBottom: "32px",
      fontSize: "14px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "12px",
    }
  }

  // computed min/max attributes for date inputs
  const fromMin = todayISO()
  let toMin = fromDate || todayISO()
  let toMax = ""
  if (fromDate) {
    const d = isoToDate(fromDate)
    const maxD = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()) // approx +1 year same day
    const y = maxD.getFullYear()
    const m = String(maxD.getMonth() + 1).padStart(2, "0")
    const day = String(maxD.getDate()).padStart(2, "0")
    toMax = `${y}-${m}-${day}`
  } else {
    // if fromDate not set, set toMax as today + 1 year
    const t = isoToDate(todayISO())
    const maxD = new Date(t.getFullYear() + 1, t.getMonth(), t.getDate())
    const y = maxD.getFullYear()
    const m = String(maxD.getMonth() + 1).padStart(2, "0")
    const day = String(maxD.getDate()).padStart(2, "0")
    toMax = `${y}-${m}-${day}`
  }

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <div style={styles.navContainer}>
        <Navbar user={employee} onLogout={onLogout} title="Details" />
      </div>

      <div style={styles.mainContainer}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <h1 style={styles.pageTitle}>{employee?.name || "Employee Details"}</h1>
            <p style={styles.pageSubtitle}>{employee?.role || "No role specified"} • {employee?.cluster || "No cluster"}</p>
          </div>
          <button style={styles.backBtn} onClick={() => onBack && onBack()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back to Directory
          </button>
        </div>

        {/* Global Error */}
        {(error || dateError) && (
          <div style={styles.globalError}>
            {error || dateError}
          </div>
        )}

        {/* Main Grid */}
        <div style={styles.grid}>
          {/* Left Column: Professional Details */}
          <div style={styles.card}>
            <div style={styles.sectionTitle}>Professional Status</div>

            {/* Current Project */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Current Project</label>
              <input
                style={styles.input}
                value={currentProject}
                onChange={(e) => {
                  const val = e.target.value
                  setCurrentProject(val)
                  const hasProject = val && val.trim().length > 0
                  setNoCurrentProject(!hasProject)
                  if (hasProject && availability === "Available") {
                    setAvailability("Occupied")
                  }
                }}
                placeholder="e.g. Project Alpha"
              />
              <div style={{ marginTop: "8px" }}>
                <label style={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    checked={noCurrentProject}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setNoCurrentProject(checked)
                      if (checked) {
                        setCurrentProject("")
                      } else {
                        if (availability === "Available") {
                          setAvailability("Occupied")
                        }
                      }
                    }}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkboxLabel}>I am currently not on any project</span>
                </label>
              </div>
            </div>

            {/* Availability */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Availability</label>
              <select
                style={{ ...styles.select, opacity: noCurrentProject ? 0.7 : 1 }}
                value={noCurrentProject ? "Available" : availability}
                onChange={(e) => setAvailability(e.target.value)}
                disabled={noCurrentProject}
              >
                <option value="Available" disabled={!noCurrentProject}>Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Partially Available">Partially Available</option>
              </select>
              {!noCurrentProject && (
                <div style={styles.helperText}>
                  Requires "No current project" to be checked to select Available.
                </div>
              )}
            </div>

            {/* Partial Availability Details */}
            {!noCurrentProject && availability === "Partially Available" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: `1px solid ${theme.border}` }}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Hours Available (per day)</label>
                  <select
                    style={styles.select}
                    value={hoursAvailable}
                    onChange={(e) => setHoursAvailable(e.target.value)}
                  >
                    <option value="">Select Hours</option>
                    <option value="2">2 hours</option>
                    <option value="4">4 hours</option>
                    <option value="6">6 hours</option>
                    <option value="8">Full Day</option>
                  </select>
                  {errors.hours && <div style={styles.errorText}>{errors.hours}</div>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>From Date</label>
                    <input
                      style={styles.input}
                      type="date"
                      value={fromDate}
                      onChange={(e) => handleFromDateChange(e.target.value)}
                      min={fromMin}
                      max={toDate || undefined}
                    />
                    {errors.fromDate && <div style={styles.errorText}>{errors.fromDate}</div>}
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>To Date</label>
                    <input
                      style={styles.input}
                      type="date"
                      value={toDate}
                      onChange={(e) => handleToDateChange(e.target.value)}
                      min={toMin}
                      max={toMax}
                    />
                    {errors.toDate && <div style={styles.errorText}>{errors.toDate}</div>}
                  </div>
                </div>
                <div style={styles.helperText}>
                  Note: Weekends are disabled. Max duration is 1 year.
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Skills & Interests */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Skills */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>Skills</div>
              <div style={styles.fieldGroup}>
                <div style={styles.tagInputContainer}>
                  <input
                    id="skillInput"
                    placeholder="Add a skill..."
                    style={styles.input}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const val = e.target.value.trim()
                        if (val) addSkill(val)
                        e.target.value = ""
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("skillInput")
                      if (el && el.value.trim()) {
                        addSkill(el.value.trim())
                        el.value = ""
                      }
                    }}
                    style={styles.addBtn}
                  >
                    Add
                  </button>
                </div>
                <div style={styles.tagsWrapper}>
                  {skills.map((s) => (
                    <div key={s} style={styles.tag}>
                      {s}
                      <button onClick={() => removeSkill(s)} style={styles.removeTagBtn}>×</button>
                    </div>
                  ))}
                  {skills.length === 0 && <span style={styles.helperText}>No skills added yet.</span>}
                </div>
              </div>
            </div>

            {/* Interests */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>Technical Interests</div>
              <div style={styles.fieldGroup}>
                <div style={styles.tagInputContainer}>
                  <input
                    id="interestInput"
                    placeholder="Add an interest..."
                    style={styles.input}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const val = e.target.value.trim()
                        if (val) addInterest(val)
                        e.target.value = ""
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("interestInput")
                      if (el && el.value.trim()) {
                        addInterest(el.value.trim())
                        el.value = ""
                      }
                    }}
                    style={styles.addBtn}
                  >
                    Add
                  </button>
                </div>
                <div style={styles.tagsWrapper}>
                  {interests.map((i) => (
                    <div key={i} style={styles.tag}>
                      {i}
                      <button onClick={() => removeInterest(i)} style={styles.removeTagBtn}>×</button>
                    </div>
                  ))}
                  {interests.length === 0 && <span style={styles.helperText}>No interests added yet.</span>}
                </div>
              </div>
            </div>

            {/* Previous Projects */}
            <div style={styles.card}>
              <div style={styles.sectionTitle}>Previous Projects</div>
              <div style={styles.fieldGroup}>
                <div style={styles.tagInputContainer}>
                  <input
                    id="previousInput"
                    placeholder="Add a project..."
                    style={styles.input}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const val = e.target.value.trim()
                        if (val) addPrevious(val)
                        e.target.value = ""
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("previousInput")
                      if (el && el.value.trim()) {
                        addPrevious(el.value.trim())
                        el.value = ""
                      }
                    }}
                    style={styles.addBtn}
                  >
                    Add
                  </button>
                </div>
                <div style={styles.tagsWrapper}>
                  {previousProjects.map((p) => (
                    <div key={p} style={styles.tag}>
                      {p}
                      <button onClick={() => removePrevious(p)} style={styles.removeTagBtn}>×</button>
                    </div>
                  ))}
                  {previousProjects.length === 0 && <span style={styles.helperText}>No previous projects listed.</span>}
                </div>
              </div>
            </div>
          </div>
        </div >
      </div >

      {/* Floating Save Bar */}
      < div style={styles.saveBar} >
        <button type="button" onClick={() => onBack && onBack()} style={styles.cancelBtn}>
          Cancel
        </button>
        <button type="button" onClick={handleSave} style={styles.saveBtn} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div >
    </div >
  )
}
