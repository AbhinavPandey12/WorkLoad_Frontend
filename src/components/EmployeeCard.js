import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { Button } from "react-bootstrap"
import { API_URL } from "../config"

export default function EmployeeCard({ employee = {}, getInitials, currentUser, onRefresh, allProjects = [] }) {
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form State
  const [formData, setFormData] = useState({})
  const [dateError, setDateError] = useState("")

  const {
    name = "Unknown",
    availability = "Occupied",
    current_skills,
    interests,
    previous_projects,
    role,
    email,
    hours_available,
    from_date,
    to_date,
    updated_at,
    stars,
  } = employee || {}

  // Initialize form data when entering edit mode
  useEffect(() => {
    if (isEditing) {
      // console.log("EmployeeCard: Edit mode activated");
      setFormData({
        current_project: employee.current_project || employee.currentProject || "",
        availability: employee.availability || "Occupied",
        hours_available: employee.hours_available || employee.hoursAvailable || "",
        from_date: employee.from_date ? employee.from_date.split("T")[0] : (employee.fromDate || ""),
        to_date: employee.to_date ? employee.to_date.split("T")[0] : (employee.toDate || ""),
        current_skills: parseListField(employee.current_skills),
        interests: parseListField(employee.interests),
        previous_projects: parseListField(employee.previous_projects),
      })
    }
  }, [isEditing, employee])

  // Enforce: No Project -> Available
  // Enforce: No Project -> Available, Project -> Not Available
  useEffect(() => {
    if (isEditing) {
      if (!formData.current_project || !formData.current_project.trim()) {
        // No project => Force Available
        if (formData.availability && formData.availability !== "Available") {
          setFormData(prev => ({ ...prev, availability: "Available" }))
        }
      } else {
        // Has project => Force NOT Available (if it was Available)
        if (formData.availability === "Available") {
          setFormData(prev => ({ ...prev, availability: "Occupied" }))
        }
      }
    }
  }, [formData.current_project, isEditing, formData.availability])

  // robust parsing for SheetDB
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

  const safeSkills = parseListField(current_skills)
  const safeInterests = parseListField(interests)
  const safePrevious = parseListField(previous_projects)

  const getInitialsColor = (nm) => {
    const colors = ["#0072bc", "#d32f2f", "#2e7d32", "#f57c00", "#7b1fa2"]
    const n = (nm || " ").toString()
    let hash = 0
    for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return ""
    try {
      const isoPart = dateStr.split("T")[0].split(" ")[0]
      const parts = isoPart.split("-")
      if (parts.length === 3) {
        const [year, month, day] = parts
        return `${day}-${month}-${year}`
      }
    } catch { }
    return dateStr
  }

  // ---------- New: parse dates, humanize update text, and color ----------
  const parseToDate = (d) => {
    if (!d) return null
    if (d instanceof Date) return d
    if (typeof d === "number") return new Date(d)
    if (typeof d !== "string") return null
    try {
      let s = d.trim()
      // handle "YYYY-MM-DD HH:MM:SS" by replacing first space with 'T'
      if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(s)) {
        s = s.replace(/\s+/, "T")
      }
      const hasTimeZone = /Z$|[+-]\d{2}:?\d{2}$/.test(s);
      if (!hasTimeZone) {
        s += "Z"
      }

      const dt = new Date(s)
      if (isNaN(dt.getTime())) return null

      return dt
    } catch {
      return null
    }
  }

  const getUpdatedText = (updatedAt) => {
    const dt = parseToDate(updatedAt)
    if (!dt) return ""
    const now = new Date()
    const diffMs = now.getTime() - dt.getTime()
    if (diffMs < 0) return "" // ignore future dates

    const msPerMinute = 1000 * 60
    const msPerHour = msPerMinute * 60
    const msPerDay = msPerHour * 24

    const days = Math.floor(diffMs / msPerDay)
    if (days >= 1) {
      return `Updated ${days} day${days === 1 ? "" : "s"} ago`
    }
    const hours = Math.floor(diffMs / msPerHour)
    if (hours >= 1) {
      return `Updated ${hours} hr${hours === 1 ? "" : "s"} ago`
    }
    const minutes = Math.floor(diffMs / msPerMinute)
    if (minutes >= 1) {
      return `Updated ${minutes} min${minutes === 1 ? "" : "s"} ago`
    }
    return "Updated just now"
  }

  const getUpdateColor = (updatedAt) => {
    const dt = parseToDate(updatedAt)
    if (!dt) return "#9ca3af" // neutral gray

    const now = new Date()
    const diffDays = Math.floor((now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays <= 7) return "#2e7d32" // green
    if (diffDays <= 15) return "#f57c00" // orange
    return "#d32f2f" // red
  }

  const updatedText = getUpdatedText(updated_at)



  // ---------- date change handlers with validations ----------
  const handleFromDateChange = (iso) => {
    setDateError("")
    if (!iso) {
      setFormData({ ...formData, from_date: "" })
      return
    }

    // from must be >= today
    const today = todayISO()
    if (isoToDate(iso) < isoToDate(today)) {
      setDateError("From date cannot be earlier than today.")
      return // Reject change
    }

    // no weekends
    if (isWeekend(iso)) {
      setDateError("Weekends are disabled. Please select a weekday.")
      return // Reject change
    }

    // if toDate exists, ensure from <= to
    if (formData.to_date) {
      if (isoToDate(iso) > isoToDate(formData.to_date)) {
        setDateError("From date cannot be after To date.")
        return // Reject change
      }

      const diff = daysBetween(iso, formData.to_date)
      if (diff !== null && diff > maxSeparationDays) {
        setDateError("Separation between From and To cannot exceed 1 year.")
        return // Reject change
      }
    }

    // Valid -> Update state
    setFormData({ ...formData, from_date: iso })
  }

  const handleToDateChange = (iso) => {
    setDateError("")
    if (!iso) {
      setFormData({ ...formData, to_date: "" })
      return
    }

    // no weekends
    if (isWeekend(iso)) {
      setDateError("Weekends are disabled. Please select a weekday.")
      return // Reject change
    }

    // if fromDate exists, ensure to >= from
    if (formData.from_date) {
      if (isoToDate(iso) < isoToDate(formData.from_date)) {
        setDateError("To date cannot be earlier than From date.")
        return // Reject change
      }

      const diff = daysBetween(formData.from_date, iso)
      if (diff !== null && diff > maxSeparationDays) {
        setDateError("Separation between From and To cannot exceed 1 year.")
        return // Reject change
      }
    } else {
      // if fromDate not set, ensure toDate is >= today
      const today = todayISO()
      if (isoToDate(iso) < isoToDate(today)) {
        setDateError("To date cannot be earlier than today.")
        return // Reject change
      }
    }

    // Valid -> Update state
    setFormData({ ...formData, to_date: iso })
  }

  // validation derived from formData
  const validationErrors = {
    hours: (formData.availability === "Partially Available" && (!formData.hours_available || isNaN(Number(formData.hours_available)))) ? "Specify hours" : "",
    fromDate: (formData.availability === "Partially Available" && !formData.from_date) ? "From date required" : "",
    toDate: (formData.availability === "Partially Available" && !formData.to_date) ? "To date required" : "",
  }
  const isValid = () => !Object.values(validationErrors).some(Boolean) && !dateError

  // --- Edit Handlers ---
  const handleSave = async (e) => {
    e.stopPropagation()

    if (formData.availability === "Partially Available") {
      if (!isValid()) {
        toast.warn("Please fix validation errors before saving.")
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        updated_at: new Date().toISOString(),
        // Ensure numbers
        hours_available: formData.availability === "Partially Available" ? Number(formData.hours_available) : null,
        from_date: formData.availability === "Partially Available" ? (formData.from_date || null) : null,
        to_date: formData.availability === "Partially Available" ? (formData.to_date || null) : null,
      }

      // Clean undefined
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])

      const url = `${API_URL}/api/employees/${employee.empid || employee.id}`
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error("Failed to update")

      setIsEditing(false)
      if (onRefresh) onRefresh()
      toast.success("Employee details updated!")
    } catch (err) {
      toast.error("Update failed: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  const addTag = (field, val) => {
    if (!val) return
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), val]
    }))
  }

  const removeTag = (field, val) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter(x => x !== val)
    }))
  }

  const styles = {
    card: {
      background: "#fff",
      border: "1px solid #eee",
      borderRadius: "4px",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      transition: "all 0.25s ease",
      cursor: "pointer",
      height: expanded ? "auto" : "auto",
    },
    cardHover: {
      transform: "translateY(-6px)",
      boxShadow: "0 10px 24px rgba(0,0,0,0.09)",
    },
    header: {
      padding: "16px",
      background: "#fbfbfd",
      borderBottom: expanded ? "1px solid #f0f0f5" : "none",
    },
    topRow: {
      display: "flex",
      gap: "12px",
      alignItems: "center",
    },
    initialsCircle: {
      width: "56px",
      height: "56px",
      borderRadius: "50%",
      background: getInitialsColor(name),
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "20px",
      fontWeight: "700",
      flexShrink: 0,
    },
    nameBlock: {
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
    },
    name: {
      color: "#072a53",
      margin: 0,
      fontSize: "16px",
      fontWeight: 700,
      letterSpacing: "0.2px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    subtitle: {
      margin: "6px 0 0 0",
      color: "#6b7280",
      fontSize: "13px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "flex",
      gap: 8,
      alignItems: "center",
    },
    updatedText: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: 600,
      lineHeight: "14px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    infoList: {
      marginTop: "12px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    },
    infoRow: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "13px",
      color: "#374151",
    },
    iconWrap: {
      width: "18px",
      height: "18px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    body: {
      padding: "14px 16px",
      maxHeight: "520px",
      overflowY: "auto",
      background: "#ffffff",
    },
    section: {
      marginBottom: "14px",
    },
    sectionTitle: {
      fontWeight: 700,
      color: "#0b5fa5",
      marginBottom: "8px",
      fontSize: "14px",
    },
    tags: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
    },
    tag: {
      background: "#e8f4ff",
      color: "#0b5fa5",
      padding: "6px 12px",
      borderRadius: "18px",
      fontSize: "12px",
    },
    footerHint: {
      padding: "10px 16px",
      textAlign: "center",
      borderTop: "1px solid #f0f0f5",
      background: "#fbfbfd",
      fontSize: "13px",
      color: "#6b7280",
      display: expanded ? "none" : "block",
    },
    statusDot: {
      width: "10px",
      height: "10px",
      borderRadius: "50%",
      display: "inline-block",
      marginRight: "8px",
      flexShrink: 0,
    },
    detailRowText: {
      fontSize: "13px",
      color: "#374151",
      marginBottom: 6,
    },
    detailLabelStrong: {
      fontWeight: 600,
      marginRight: 8,
    },
    // Edit Styles
    editContainer: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      padding: "4px",
    },
    editGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", // Smaller min-width for better flexing
      gap: "12px",
    },
    editField: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    editInput: {
      width: "100%",
      boxSizing: "border-box", // Critical for responsive width
      padding: "10px 12px", // Slightly more compact
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      fontSize: "13px", // Slightly smaller font
      color: "#111827",
      background: "#ffffff",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      outline: "none",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
    },
    editInputFocus: {
      borderColor: "#2563eb", // Blue-600
      boxShadow: "0 0 0 4px rgba(37, 99, 235, 0.1)", // Soft ring
    },
    editLabel: {
      fontSize: "11px",
      fontWeight: "700",
      color: "#6b7280",
      textTransform: "uppercase",
      letterSpacing: "0.8px",
      marginBottom: "4px",
    },
    editSectionTitle: {
      fontSize: "13px",
      fontWeight: "700",
      color: "#374151",
      marginBottom: "16px",
      borderBottom: "1px solid #e5e7eb",
      paddingBottom: "8px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    editBtn: {
      padding: "10px 20px",
      borderRadius: "10px", // Slightly rounded like others
      border: "none",
      background: "linear-gradient(90deg, #0078d4, #005fa3)", // Matching DetailScreen
      color: "white",
      fontSize: "13px",
      fontWeight: "700", // Bolder like others
      cursor: "pointer",
      boxShadow: "0 4px 12px rgba(0, 120, 212, 0.2)", // Matching shadow tone
      transition: "transform 0.1s ease, box-shadow 0.1s ease",
    },
    cancelBtn: {
      padding: "10px 20px",
      borderRadius: "10px",
      border: "1px solid #e2e8f0",
      background: "#ffffff",
      color: "#475569",
      fontSize: "13px",
      fontWeight: "700",
      cursor: "pointer",
      transition: "all 0.2s ease",
    },
    partialBox: {
      background: "#f8fafc", // Very subtle slate
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      marginTop: "8px",
    }
  }

  const handleCardClick = (e) => {
    if (isEditing) return // Don't collapse if editing
    e.stopPropagation()
    setExpanded(!expanded)
  }

  // Inline icons
  const IconBriefcase = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 3h4a1 1 0 0 1 1 1v1h3a1 1 0 0 1 1 1v3H3V6a1 1 0 0 1 1-1h3V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 11v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 13h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )



  const IconMail = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 7.5v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 7.5l-9 6-9-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const IconClock = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 7v6l3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const IconStar = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )

  // Optimistic UI state
  const [displayStars, setDisplayStars] = useState(stars || 0)

  // Sync state with props
  useEffect(() => {
    setDisplayStars(stars || 0)
  }, [stars])

  const handleStarChange = async (delta) => {
    if (!isManager) return

    const currentStars = typeof displayStars === 'number' ? displayStars : (displayStars ? 1 : 0)
    const newStarCount = Math.max(0, Math.min(100, currentStars + delta)) // Limit between 0 and 100

    // Optimistic update
    const previousStars = displayStars
    setDisplayStars(newStarCount)
    // console.log("Optimistic star update:", newStarCount);

    try {
      const url = `${API_URL}/api/employees/${employee.empid || employee.id}/stars`
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars: newStarCount })
      })
      if (!res.ok) throw new Error("Failed to update star count")
      if (onRefresh) onRefresh()
    } catch (err) {

      // Revert on failure
      setDisplayStars(previousStars)
      toast.error("Failed to update star count. Please try again.")
    }
  }

  const statusKey = (availability || "").toString().toLowerCase()

  // Calculate staleness
  let isStale = false
  if (updated_at) {
    const dt = parseToDate(updated_at)
    if (dt) {
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays > 15) isStale = true
    }
  }

  // Color logic: Muted/Professional colors
  const statusColor = isStale
    ? "#5c93bb" // Muted Blue
    : statusKey === "available"
      ? "#66bb6a" // Soft Green
      : statusKey === "occupied"
        ? "#ef5350" // Soft Red
        : "#fbc02d" // Muted Yellow/Gold

  const isPartial = statusKey === "partially available" || statusKey === "partially" || statusKey === "partial"

  // Check if manager
  const isManager = currentUser && (currentUser.role_type || "").toLowerCase() === "manager"

  return (
    <div
      style={styles.card}
      onClick={handleCardClick}
      onMouseEnter={(e) => !expanded && Object.assign(e.currentTarget.style, styles.cardHover)}
      onMouseLeave={(e) =>
        !expanded &&
        Object.assign(e.currentTarget.style, { transform: "translateY(0)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" })
      }
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? handleCardClick(e) : null)}
      aria-expanded={expanded}
    >
      <div style={{ height: "4px", width: "100%", background: statusColor, borderTopLeftRadius: "4px", borderTopRightRadius: "4px" }} />

      {/* header: name, role, availability */}
      <div style={styles.header}>
        <div style={styles.topRow}>
          <div style={styles.initialsCircle} aria-hidden>
            {getInitials ? getInitials(name) : (name || "U").slice(0, 1).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}> {/* Wrap name block to allow flex grow */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={styles.nameBlock}>
                <h3 style={styles.name}>{name}</h3>
                <p style={styles.subtitle}>
                  {role ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={styles.iconWrap}>
                        <IconBriefcase />
                      </span>
                      <span>{role}</span>
                    </span>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>No role specified</span>
                  )}
                </p>

                {/* availability stays in header (collapsed view shows this) */}
                <div style={{ marginTop: 6 }}>
                  <div style={{ ...styles.infoRow, alignItems: "center" }} aria-label={`Status: ${availability}`}>
                    <span style={{ ...styles.statusDot, background: statusColor }} />
                    <strong style={{ fontSize: "13px", color: "#374151", fontWeight: 600, whiteSpace: "nowrap" }}>{availability}</strong>
                  </div>

                  {/* Updated text - below availability, only in collapsed view */}
                  {!expanded && updatedText && (
                    <div
                      style={{
                        ...styles.updatedText,
                        color: getUpdateColor(updated_at),
                      }}
                      aria-live="polite"
                    >
                      {updatedText}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                {/* Star Counter with Vertical Arrows */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#fff",
                    padding: "2px 6px",
                    borderRadius: "6px",
                    border: "1px solid #f1f5f9",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "15px", fontWeight: "700", color: "#334155" }}>{displayStars}</span>
                    <IconStar filled={displayStars > 0} />
                  </div>

                  {isManager && (
                    <div className="d-flex flex-column gap-1">
                      <Button
                        variant="light"
                        size="sm"
                        className="p-0 border-0 d-flex align-items-center justify-content-center text-primary"
                        style={{ width: "16px", height: "12px", lineHeight: 1 }}
                        onClick={(e) => { e.stopPropagation(); handleStarChange(1); }}
                        title="Increase"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 15l-6-6-6 6" />
                        </svg>
                      </Button>
                      <Button
                        variant="light"
                        size="sm"
                        className="p-0 border-0 d-flex align-items-center justify-content-center text-secondary"
                        style={{ width: "16px", height: "12px", lineHeight: 1 }}
                        onClick={(e) => { e.stopPropagation(); handleStarChange(-1); }}
                        title="Decrease"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* expanded content */}
      {
        expanded && (
          <div style={styles.body} onClick={e => e.stopPropagation()}>
            {isEditing ? (
              // --- EDIT MODE ---
              <div style={styles.editContainer}>
                <div style={styles.editGrid}>
                  <div style={styles.editField}>
                    <label style={styles.editLabel}>Current Project</label>
                    <input
                      style={styles.editInput}
                      value={formData.current_project || ""}
                      onChange={e => setFormData({ ...formData, current_project: e.target.value })}
                      placeholder="Project Name"
                      list={`project-options-${employee.empid || employee.id}`}
                    />
                    <datalist id={`project-options-${employee.empid || employee.id}`}>
                      {allProjects.map((proj, idx) => (
                        <option key={idx} value={proj} />
                      ))}
                    </datalist>
                  </div>

                  <div style={styles.editField}>
                    <label style={styles.editLabel}>Availability</label>
                    <select
                      style={styles.editInput}
                      value={formData.availability || "Occupied"}
                      onChange={e => setFormData({ ...formData, availability: e.target.value })}
                      disabled={!formData.current_project || !formData.current_project.trim()}
                    >
                      <option value="Available" disabled={!!(formData.current_project && formData.current_project.trim())}>Available</option>
                      <option value="Occupied">Occupied</option>
                      <option value="Partially Available">Partially Available</option>
                    </select>
                  </div>
                </div>
                {(!formData.current_project || !formData.current_project.trim()) && (
                  <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px", paddingLeft: "4px" }}>
                    Requires Current Project to change availability
                  </div>
                )}

                {formData.availability === "Partially Available" && (
                  <div style={styles.partialBox}>
                    <div style={styles.editSectionTitle}>Partial Availability Details</div>

                    {dateError && <div style={{ color: "#d32f2f", fontSize: "13px", marginBottom: "8px", fontWeight: "600" }}>{dateError}</div>}

                    <div style={styles.editGrid}>
                      <div style={styles.editField}>
                        <label style={styles.editLabel}>Hours/Day</label>
                        <select
                          style={styles.editInput}
                          value={formData.hours_available || ""}
                          onChange={e => setFormData({ ...formData, hours_available: e.target.value })}
                        >
                          <option value="">Select Hours</option>
                          <option value="2">2 hours</option>
                          <option value="4">4 hours</option>
                          <option value="6">6 hours</option>
                          <option value="8">Full Day</option>
                        </select>
                        {validationErrors.hours && <div style={{ color: "#d32f2f", fontSize: "11px" }}>{validationErrors.hours}</div>}
                      </div>
                      <div style={styles.editField}>
                        <label style={styles.editLabel}>From Date</label>
                        <input
                          style={styles.editInput}
                          type="date"
                          value={formData.from_date || ""}
                          onChange={e => handleFromDateChange(e.target.value)}
                          min={todayISO()}
                        />
                        {validationErrors.fromDate && <div style={{ color: "#d32f2f", fontSize: "11px" }}>{validationErrors.fromDate}</div>}
                      </div>
                      <div style={styles.editField}>
                        <label style={styles.editLabel}>To Date</label>
                        <input
                          style={styles.editInput}
                          type="date"
                          value={formData.to_date || ""}
                          onChange={e => handleToDateChange(e.target.value)}
                          min={formData.from_date || todayISO()}
                        />
                        {validationErrors.toDate && <div style={{ color: "#d32f2f", fontSize: "11px" }}>{validationErrors.toDate}</div>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Skills Edit */}
                <div style={styles.editField}>
                  <label style={styles.editLabel}>Skills</label>
                  <div style={styles.tags}>
                    {(formData.current_skills || []).map(s => (
                      <span key={s} style={styles.tag}>
                        {s} <span style={{ cursor: 'pointer', fontWeight: 'bold', marginLeft: 4 }} onClick={() => removeTag('current_skills', s)}>×</span>
                      </span>
                    ))}
                  </div>
                  <input
                    style={{ ...styles.editInput, marginTop: 8 }}
                    placeholder="Type skill and press Enter..."
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag('current_skills', e.target.value.trim())
                        e.target.value = ''
                      }
                    }}
                  />
                </div>

                {/* Interests Edit */}
                <div style={styles.editField}>
                  <label style={styles.editLabel}>Interests</label>
                  <div style={styles.tags}>
                    {(formData.interests || []).map(i => (
                      <span key={i} style={{ ...styles.tag, background: "#f3e5f5", color: "#7b1fa2" }}>
                        {i} <span style={{ cursor: 'pointer', fontWeight: 'bold', marginLeft: 4 }} onClick={() => removeTag('interests', i)}>×</span>
                      </span>
                    ))}
                  </div>
                  <input
                    style={{ ...styles.editInput, marginTop: 8 }}
                    placeholder="Type interest and press Enter..."
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag('interests', e.target.value.trim())
                        e.target.value = ''
                      }
                    }}
                  />
                </div>

                {/* Previous Projects Edit */}
                <div style={styles.editField}>
                  <label style={styles.editLabel}>Previous Projects</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(formData.previous_projects || []).map(p => (
                      <div key={p} style={{ fontSize: '13px', color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                        • {p} <span style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }} onClick={() => removeTag('previous_projects', p)}>×</span>
                      </div>
                    ))}
                  </div>
                  <input
                    style={{ ...styles.editInput, marginTop: 8 }}
                    placeholder="Type project and press Enter..."
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag('previous_projects', e.target.value.trim())
                        e.target.value = ''
                      }
                    }}
                  />
                </div>

                {/* Cluster Edit */}
                {/* <div style={{ ...styles.editSectionTitle, marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>Cluster Details</div>
                <div style={styles.editGrid}>
                  <div style={styles.editField}>
                    <label style={styles.editLabel}>Cluster</label>
                    <select
                      style={styles.editInput}
                      value={formData.clusterMode || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => {
                          const newData = { ...prev, clusterMode: val };
                          if (val !== "Multiple") {
                            newData.cluster = val;
                            newData.cluster2 = "";
                          } else {
                            // If switching to Multiple, keep existing as cluster1 if valid
                            if (prev.clusterMode && prev.clusterMode !== "Multiple") {
                              newData.cluster = prev.clusterMode;
                            }
                          }
                          return newData;
                        });
                      }}
                    >
                      <option value="">Select Cluster</option>
                      <option value="MEBM">MEBM</option>
                      <option value="M&T">M&T</option>
                      <option value="S&PS Insitu">S&PS Insitu</option>
                      <option value="S&PS Exsitu">S&PS Exsitu</option>
                      <option value="Multiple">Multiple</option>
                    </select>
                  </div>

                  {formData.clusterMode === "Multiple" && (
                    <>
                      <div style={styles.editField}>
                        <label style={styles.editLabel}>Cluster 1</label>
                        <select
                          style={styles.editInput}
                          value={formData.cluster || ""}
                          onChange={e => setFormData({ ...formData, cluster: e.target.value })}
                        >
                          <option value="">Select Cluster 1</option>
                          <option value="MEBM">MEBM</option>
                          <option value="M&T">M&T</option>
                          <option value="S&PS Insitu">S&PS Insitu</option>
                          <option value="S&PS Exsitu">S&PS Exsitu</option>
                        </select>
                      </div>
                      <div style={styles.editField}>
                        <label style={styles.editLabel}>Cluster 2</label>
                        <select
                          style={styles.editInput}
                          value={formData.cluster2 || ""}
                          onChange={e => setFormData({ ...formData, cluster2: e.target.value })}
                        >
                          <option value="">Select Cluster 2</option>
                          <option value="MEBM">MEBM</option>
                          <option value="M&T">M&T</option>
                          <option value="S&PS Insitu">S&PS Insitu</option>
                          <option value="S&PS Exsitu">S&PS Exsitu</option>
                        </select>
                      </div>
                    </>
                  )}
                </div> */}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: "12px", marginTop: "16px", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                  <button style={styles.cancelBtn} onClick={() => setIsEditing(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button style={styles.editBtn} onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              // --- VIEW MODE ---
              <>
                {/* If partially available show Hours/From/To right away */}
                {isPartial && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={styles.iconWrap}>
                        <IconClock />
                      </span>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={styles.detailRowText}>
                          <span style={styles.detailLabelStrong}>Hours:</span>
                          <span>{hours_available ? `${hours_available} hours/day` : "Not specified"}</span>
                        </div>
                        <div style={styles.detailRowText}>
                          <span style={styles.detailLabelStrong}>From:</span>
                          <span>{from_date ? formatDateDisplay(from_date) : "—"}</span>
                        </div>
                        <div style={styles.detailRowText}>
                          <span style={styles.detailLabelStrong}>To:</span>
                          <span>{to_date ? formatDateDisplay(to_date) : "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email */}
                {email && (
                  <div style={styles.section}>
                    <div style={styles.infoRow}>
                      <span style={styles.iconWrap}>
                        <IconMail />
                      </span>
                      <a href={`mailto:${email}`} style={{ color: "#0b5fa5", textDecoration: "none", fontSize: "13px" }}>
                        {email}
                      </a>
                    </div>
                  </div>
                )}

                {/* Skills */}
                {safeSkills && safeSkills.length > 0 && (
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Skills</div>
                    <div style={styles.tags}>
                      {safeSkills.map((skill) => (
                        <span key={skill} style={styles.tag}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests */}
                {safeInterests && safeInterests.length > 0 && (
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Interests</div>
                    <div style={styles.tags}>
                      {safeInterests.map((interest) => (
                        <span key={interest} style={{ ...styles.tag, background: "#f3e5f5", color: "#7b1fa2" }}>
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous projects */}
                {safePrevious && safePrevious.length > 0 && (
                  <div style={styles.section}>
                    <div style={styles.sectionTitle}>Previous projects</div>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: "13px", color: "#374151" }}>
                      {safePrevious.map((proj, idx) => (
                        <li key={idx} style={{ marginBottom: 6 }}>
                          {proj}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Manager Edit Button */}
                {isManager && (
                  <div style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 12, textAlign: 'right' }}>
                    <button
                      style={styles.editBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsEditing(true)
                      }}
                    >
                      Edit Details
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )
      }

      <div style={styles.footerHint}>Click to expand →</div>
    </div >
  )
}
