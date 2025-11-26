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
      console.log("[DetailScreen] Save payload:", payload, "target:", target)

      // Try PUT
      let res = await fetch(target, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      let body = await readResponse(res)
      console.log("[DetailScreen] PUT", res.status, body)

      // PATCH fallback
      if (!res.ok) {
        console.warn("[DetailScreen] PUT failed; trying PATCH")
        res = await fetch(target, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        body = await readResponse(res)
        console.log("[DetailScreen] PATCH", res.status, body)
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
        console.log("[DetailScreen] POST", postRes.status, postBody)
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


  // ---------- STYLES (cleaner / less clutter) ----------
  const styles = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f4f7fb 0%, #ffffff 40%)",
      padding: isMobile ? "8px 12px" : "12px 20px",
      fontFamily: "Segoe UI, Tahoma, sans-serif",
    },
    navWrapper: {
      marginBottom: 18,
      background: "linear-gradient(90deg, #016db9 0%, #0078d4 100%)",
      borderRadius: 10,
      boxShadow: "0 6px 18px rgba(3, 45, 85, 0.06)",
    },


    // detail card / form styles
    container: {
      maxWidth: 980,
      margin: "0 auto",
      padding: isMobile ? 16 : 28,
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 18px 48px rgba(12,36,72,0.06)",
      color: "#072a53",
    },
    headerRow: { display: "flex", alignItems: "center", marginBottom: 18, justifyContent: "space-between" },
    pageTitle: { fontSize: 22, fontWeight: 800, color: "#072a53" },
    backBtn: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "none",
      cursor: "pointer",
      background: "#f3f7fb",
      color: "#072a53",
      fontWeight: 700,
      boxShadow: "0 6px 20px rgba(3,45,85,0.04)",
      transform: "translateY(0)",
    },
    // smaller checkbox style
    smallCheckboxWrap: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" },
    smallCheckbox: { transform: "scale(0.9)", marginRight: 4, cursor: "pointer" },

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
    textarea: { padding: 12, borderRadius: 10, border: "1px solid #e8eef6", fontSize: 15, minHeight: 120 },
    select: { padding: 12, borderRadius: 10, border: "1px solid #e8eef6", background: "#fbfdff", fontSize: 15 },
    tagRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 },
    tag: {
      background: "#eef7ff",
      color: "#024a7a",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 13,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      boxShadow: "0 4px 12px rgba(2,6,23,0.04)",
    },
    addBtn: {
      padding: "8px 12px",
      borderRadius: 10,
      border: "1px solid #d7eafa",
      background: "#eef7ff",
      cursor: "pointer",
      fontWeight: 700,
    },
    errorBox: { background: "#fff6f6", padding: 12, borderRadius: 8, color: "#b71c1c", marginBottom: 12 },
    actions: { display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 },
    saveBtn: {
      padding: "12px 18px",
      borderRadius: 12,
      background: "linear-gradient(90deg,#0078d4,#005fa3)",
      color: "#fff",
      border: "none",
      cursor: "pointer",
      fontWeight: 800,
      boxShadow: "0 10px 30px rgba(3, 45, 85, 0.12)",
      minWidth: 140,
      opacity: saving ? 0.8 : 1,
    },
    dateNote: { fontSize: 12, color: "#6b7280", marginTop: 6 }
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
      {/* Navbar wrapper */}
      <div style={styles.navWrapper}>
        <Navbar user={employee} onLogout={onLogout} title="Details" />
      </div>

      {/* Hidden developer image path */}
      <img src="/mnt/data/a36fa973-d177-491a-98fd-19da52171079.png" alt="" style={{ display: "none" }} />

      {/* Detail card / form */}
      <div style={styles.container} role="region" aria-label="Details screen">
        <div style={styles.headerRow}>
          <div style={styles.pageTitle}>Details</div>
          <div>
            <button style={styles.backBtn} onClick={() => onBack && onBack()}>
              ← Back
            </button>
          </div>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {dateError && <div style={{ ...styles.errorBox, marginBottom: 12 }}>{dateError}</div>}

        <div style={styles.formRow}>
          <div style={styles.field}>
            <label style={styles.label}>Current Project</label>
            <input style={styles.input} value={currentProject} onChange={(e) => setCurrentProject(e.target.value)} placeholder="Project name or blank" />
            {/* smaller checkbox inline, removed explanatory text */}
            <div style={{ marginTop: 10 }}>
              <label style={styles.smallCheckboxWrap}>
                <input
                  type="checkbox"
                  checked={noCurrentProject}
                  onChange={(e) => setNoCurrentProject(e.target.checked)}
                  style={styles.smallCheckbox}
                  aria-label="No current project"
                />
                <span style={{ fontSize: 13, color: "#374151" }}>No current project</span>
              </label>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Availability</label>
            {noCurrentProject ? (
              <input style={styles.input} value="Available" disabled />
            ) : (
              <select style={styles.select} value={availability} onChange={(e) => setAvailability(e.target.value)}>
                <option value="Partially Available">Partially Available</option>
                <option value="Occupied">Occupied</option>
              </select>
            )}
          </div>

          {/* When partially available show hours/dates */}
          {(!noCurrentProject && availability === "Partially Available") && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Hours Available (per day)</label>
                <input style={styles.input} value={hoursAvailable} onChange={(e) => setHoursAvailable(e.target.value)} placeholder="4" />
                {errors.hours && <div style={{ color: "#d32f2f", marginTop: 6 }}>{errors.hours}</div>}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>From Date</label>
                <input
                  style={styles.input}
                  type="date"
                  value={fromDate}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  min={fromMin}
                  max={toDate ? toDate : undefined} // prevent picking from > to when to exists
                />
                <div style={styles.dateNote}>From must be ≥ today and cannot be weekend.</div>
                {errors.fromDate && <div style={{ color: "#d32f2f", marginTop: 6 }}>{errors.fromDate}</div>}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>To Date</label>
                <input
                  style={styles.input}
                  type="date"
                  value={toDate}
                  onChange={(e) => handleToDateChange(e.target.value)}
                  min={toMin}
                  max={toMax}
                />
                <div style={styles.dateNote}>To cannot be weekend. Max separation between From and To is 1 year.</div>
                {errors.toDate && <div style={{ color: "#d32f2f", marginTop: 6 }}>{errors.toDate}</div>}
              </div>
            </>
          )}

          {/* Skills (tags) */}
          <div style={styles.field}>
            <label style={styles.label}>Skills</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="skillInput"
                placeholder="Add skill & press Enter"
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
                  if (!el) return
                  const val = el.value.trim()
                  if (val) addSkill(val)
                  el.value = ""
                }}
                style={styles.addBtn}
              >
                Add
              </button>
            </div>
            <div style={styles.tagRow}>
              {skills.map((s) => (
                <div key={s} style={styles.tag}>
                  <span>{s}</span>
                  <button onClick={() => removeSkill(s)} style={{ background: "transparent", border: "none", color: "#024a7a", fontWeight: 800, cursor: "pointer" }}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Interests (now tag style like skills) */}
          <div style={styles.field}>
            <label style={styles.label}>Technical Interests</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="interestInput"
                placeholder="Add technical interests & press Enter"
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
                  if (!el) return
                  const val = el.value.trim()
                  if (val) addInterest(val)
                  el.value = ""
                }}
                style={styles.addBtn}
              >
                Add
              </button>
            </div>
            <div style={styles.tagRow}>
              {interests.map((i) => (
                <div key={i} style={styles.tag}>
                  <span>{i}</span>
                  <button onClick={() => removeInterest(i)} style={{ background: "transparent", border: "none", color: "#024a7a", fontWeight: 800, cursor: "pointer" }}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Previous Projects (tag-style) */}
          <div style={styles.field}>
            <label style={styles.label}>Previous Projects</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="previousInput"
                placeholder="Add project & press Enter"
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
                  if (!el) return
                  const val = el.value.trim()
                  if (val) addPrevious(val)
                  el.value = ""
                }}
                style={styles.addBtn}
              >
                Add
              </button>
            </div>
            <div style={styles.tagRow}>
              {previousProjects.map((p) => (
                <div key={p} style={styles.tag}>
                  <span>{p}</span>
                  <button onClick={() => removePrevious(p)} style={{ background: "transparent", border: "none", color: "#024a7a", fontWeight: 800, cursor: "pointer" }}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button type="button" onClick={handleSave} style={styles.saveBtn} disabled={saving}>
            {saving ? "Saving..." : "Save details"}
          </button>
        </div>
      </div>
    </div>
  )
}
