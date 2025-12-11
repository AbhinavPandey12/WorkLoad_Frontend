import React, { useEffect, useState } from "react"
import { toast } from "react-toastify"

import Navbar from "../components/Navbar"
import { API_URL } from "../config"

import Loader from "../components/Loader"
import CreatableSelect from "../components/CreatableSelect"

export default function DetailScreen({ employee = null, onBack, onSaveDetails, onLogout, onProfile }) {
    // ---------- LOGIC (Original from User) ----------
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
    const [currentPreviousInput, setCurrentPreviousInput] = useState("")

    const [loading, setLoading] = useState(true)
    const [saving, setSavingState] = useState(false)
    const [error, setError] = useState("")
    const [dateError, setDateError] = useState("")
    const [showHint, setShowHint] = useState(false)

    // Derived project list
    const [allProjects, setAllProjects] = useState([])



    // helper to parse list-like values
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
        return day === 0 || day === 6
    }

    const daysBetween = (aIso, bIso) => {
        const a = isoToDate(aIso)
        const b = isoToDate(bIso)
        if (!a || !b) return null
        const diffMs = Math.abs(b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0))
        return Math.round(diffMs / (1000 * 60 * 60 * 24))
    }

    const maxSeparationDays = 365

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

    // background refresh
    useEffect(() => {
        if (!employee || !employee.empid) return
        const id = employee.empid
        const url = `${API_URL.replace(/\/$/, "")}/api/employees/${encodeURIComponent(id)}`
            ; (async () => {
                try {
                    setLoading(true)
                    const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } })
                    if (!res.ok) return
                    const data = await res.json()
                    const obj = Array.isArray(data) ? data[0] || data : data
                    if (!obj) return
                    setCurrentProject((cur) => (cur ? cur : obj.current_project || obj.currentProject || ""))
                    setNoCurrentProject((cur) => (cur ? cur : !(obj.current_project || obj.currentProject || "")))

                    setAvailability((cur) => {
                        if (cur) return cur
                        let av = obj.availability || "Occupied"
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
                } finally {
                    setLoading(false)
                }
            })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employee && employee.empid])

    // Fetch all employees + Project Cache to derive global project list
    useEffect(() => {
        const fetchAllForDropdown = async () => {
            try {
                // 1. Fetch employees for legacy project derivation
                const urlEmp = `${API_URL.replace(/\/$/, "")}/api/employees`
                const resEmp = await fetch(urlEmp, { method: "GET", headers: { "Content-Type": "application/json" } })

                let employees = []
                if (resEmp.ok) {
                    const data = await resEmp.json()
                    if (Array.isArray(data)) employees = data
                }

                // 2. Fetch Project Cache from DB
                let dbProjects = []
                try {
                    const urlProj = `${API_URL.replace(/\/$/, "")}/api/projects`
                    const resProj = await fetch(urlProj)
                    if (resProj.ok) {
                        const dataP = await resProj.json()
                        dbProjects = dataP.map(p => p.project_name).filter(Boolean)
                    }
                } catch (e) {
                    console.warn("DetailScreen: Failed to fetch project cache:", e)
                }

                // 3. Merge
                const unique = Array.from(
                    new Set([
                        ...dbProjects,
                        ...employees.flatMap((emp) => {
                            const projects = []
                            if (emp.current_project) projects.push(emp.current_project)
                            if (emp.currentProject) projects.push(emp.currentProject)
                            const rawPrev = emp.previous_projects || emp.previousProjects
                            if (Array.isArray(rawPrev)) {
                                projects.push(...rawPrev)
                            } else if (typeof rawPrev === "string") {
                                try {
                                    const parsed = JSON.parse(rawPrev)
                                    if (Array.isArray(parsed)) projects.push(...parsed)
                                    else projects.push(rawPrev)
                                } catch {
                                    if (rawPrev.includes(",")) projects.push(...rawPrev.split(","))
                                    else projects.push(rawPrev)
                                }
                            }
                            return projects
                        })
                    ])
                )
                    .map((p) => (typeof p === "string" ? p.trim() : ""))
                    .filter((p) => p.length > 0)
                    .sort()
                setAllProjects(unique)

            } catch (e) {
                // silent fail
            }
        }
        fetchAllForDropdown()
    }, [])

    // validation
    const errors = {
        hours: (!noCurrentProject && availability === "Partially Available" && (!hoursAvailable || isNaN(Number(hoursAvailable)))) ? "Specify hours" : "",
        fromDate: (!noCurrentProject && availability === "Partially Available" && !fromDate) ? "From date required" : "",
        toDate: (!noCurrentProject && availability === "Partially Available" && !toDate) ? "To date required" : "",
    }
    const isValid = () => !Object.values(errors).some(Boolean) && !dateError

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

    const handleFromDateChange = (iso) => {
        setDateError("")
        if (!iso) {
            setFromDate("")
            return
        }
        const today = todayISO()
        if (isoToDate(iso) < isoToDate(today)) {
            setDateError("From date cannot be earlier than today.")
            return
        }
        if (isWeekend(iso)) {
            setDateError("From date cannot be a Saturday or Sunday.")
            return
        }
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
        if (isWeekend(iso)) {
            setDateError("To date cannot be a Saturday or Sunday.")
            return
        }
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
            const today = todayISO()
            if (isoToDate(iso) < isoToDate(today)) {
                setDateError("To date cannot be earlier than today.")
                return
            }
        }
        setToDate(iso)
        setDateError("")
    }

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

            Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

            const base = API_URL.replace(/\/$/, "")
            const id = employee.empid
            const target = `${base}/api/employees/${encodeURIComponent(id)}`

            let res = await fetch(target, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            await readResponse(res)

            if (!res.ok) {
                console.warn("[DetailScreen] PUT failed; trying PATCH")
                res = await fetch(target, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
                await readResponse(res)
            }

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

            const serverRecord = await fetchServerRecord(id)
            if (!serverRecord) throw new Error("Could not fetch record after save — check backend.")

            try {
                const existing = JSON.parse(sessionStorage.getItem("user") || "{}")
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
            toast.success("Details saved Successfully...")
        } catch (err) {
            console.error("[DetailScreen] Save error:", err)
            setError(err.message || "Save failed — check console/network")
            toast.error(`Save failed: ${err.message}. See console/network tab.`)
        } finally {
            setSavingState(false)
        }
    }

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

    // ---------- STYLES (Modern & Industry Standard) ----------
    const theme = {
        primary: "#0f172a", // Slate 900
        secondary: "#334155", // Slate 700
        accent: "#4f46e5", // Indigo 600
        accentHover: "#4338ca", // Indigo 700
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
            background: theme.bg,
            fontFamily: "'Inter', sans-serif",
            color: theme.text,
            paddingBottom: "100px", // Space for fixed save bar
        },

        titleGroup: {
            display: "flex",
            flexDirection: "column",
            gap: "4px",
        },
        sectionTitle: {
            fontSize: "18px",
            fontWeight: "600",
            color: theme.primary,
            marginBottom: "20px",
            paddingBottom: "12px",
            borderBottom: `1px solid ${theme.border}`,
        },
        formGroup: {
            display: "flex",
            flexDirection: "column",
            gap: "10px",
        },
        label: {
            fontSize: "14px",
            fontWeight: "500",
            color: theme.secondary,
        },
        checkboxWrapper: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
        },
        checkbox: {
            accentColor: theme.accent,
            width: "16px",
            height: "16px",
        },
        checkboxLabel: {
            fontSize: "14px",
            color: theme.text,
        },
        tagInputContainer: {
            display: "flex",
            gap: "10px",
            marginBottom: "5px",
        },
        flexInput: {
            flex: 1,
            minWidth: 0,
            width: "auto", // Override 100% width
        },
        addBtn: {
            padding: "0 16px",
            borderRadius: "10px",
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            color: "#6ea8fe", // Blue 300 font color
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
        },
        tagsWrapper: {
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "8px",
        },
        tag: {
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "20px",
            background: "#e0f2fe", // Light blue (sky-100)
            color: "#0369a1", // Darker blue text (sky-700)
            fontSize: "14px",
            fontWeight: "500",
            border: "1px solid #bae6fd", // sky-200
        },
        removeTagBtn: {
            border: "none",
            background: "transparent",
            color: "#0369a1",
            cursor: "pointer",
            padding: "0",
            marginLeft: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            lineHeight: 1,
            opacity: 0.7,
        },
        removeTagBtnHover: {
            opacity: 1,
        },
        helperText: {
            fontSize: "13px",
            color: theme.textMuted,
            marginTop: "4px",
        },
    }

    // ...

    // computed min/max attributes for date inputs
    const fromMin = todayISO()
    let toMin = fromDate || todayISO()
    let toMax = ""
    if (fromDate) {
        const d = isoToDate(fromDate)
        const maxD = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate())
        const y = maxD.getFullYear()
        const m = String(maxD.getMonth() + 1).padStart(2, "0")
        const day = String(maxD.getDate()).padStart(2, "0")
        toMax = `${y}-${m}-${day}`
    } else {
        const t = isoToDate(todayISO())
        const maxD = new Date(t.getFullYear() + 1, t.getMonth(), t.getDate())
        const y = maxD.getFullYear()
        const m = String(maxD.getMonth() + 1).padStart(2, "0")
        const day = String(maxD.getDate()).padStart(2, "0")
        toMax = `${y}-${m}-${day}`
    }

    // CSS Styles for responsiveness + Visual Polish
    const cssStyles = `
    /* Global Reset & Typography */
    * {
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    /* Enterprise Inputs */
    .modern-input, .modern-select, .modern-textarea {
      display: block;
      width: 100%;
      padding: 10px 12px;
      font-size: 14px;
      line-height: 20px;
      color: ${theme.text};
      background-color: #fff;
      background-clip: padding-box;
      border: 1px solid ${theme.border};
      appearance: none;
      border-radius: 6px;
      transition: border-color .15s ease-in-out, box-shadow .15s ease-in-out;
    }
    .modern-input::placeholder, .modern-textarea::placeholder {
      color: ${theme.textMuted};
      opacity: 0.8;
    }
    .modern-input:focus, .modern-select:focus, .modern-textarea:focus {
      border-color: ${theme.accent};
      outline: 0;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .modern-input:disabled, .modern-select:disabled, .modern-textarea:disabled {
      background-color: #f1f5f9;
      opacity: 1;
      cursor: not-allowed;
    }
    .modern-select {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      background-size: 16px 12px;
      padding-right: 2.5rem;
    }
    .modern-textarea {
      min-height: 100px;
      resize: vertical;
    }

    /* Layout Classes */
    .responsive-container {
      max-width: 96%; /* Use more screen real estate */
      margin: 0 auto;
      width: 92%;
      padding: 0;
    }
    .responsive-card {
      position: relative;
      display: flex;
      flex-direction: column;
      min-width: 0;
      word-wrap: break-word;
      background-color: #fff;
      background-clip: border-box;
      border: 1px solid ${theme.border};
      border-radius: 4px; /* Reduced from 8px */
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      padding: 24px;
      gap: 2px;
    }
    
    .responsive-header {
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-direction: column;
      align-items: flex-start;
      padding-top: 16px; /* Reduced from 24px */
    }
    .responsive-page-title {
      font-weight: 700;
      color: ${theme.primary};
      margin: 0;
      font-size: 24px;
      letter-spacing: -0.025em;
      line-height: 32px;
    }
    
    .responsive-grid {
      display: grid;
      align-items: start;
      grid-template-columns: 1fr;
      gap: 24px;
    }

    /* Save Bar */
    .responsive-save-bar {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: auto;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid ${theme.border};
      border-radius: 12px;
      padding: 12px 24px;
      display: flex;
      justify-content: center;
      gap: 12px;
      z-index: 100;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    /* Buttons */
    .responsive-save-btn, .responsive-cancel-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      font-weight: 500;
      font-size: 14px;
      line-height: 20px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      white-space: nowrap;
    }
    .responsive-save-btn {
      color: #052c65; /* Dark Blue text for contrast */
      background-color: #6ea8fe; /* Blue 300 */
      border: 1px solid transparent;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    .responsive-save-btn:hover {
      background-color: ${theme.accentHover};
    }
    .responsive-save-btn:focus {
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
    }
    
    .responsive-cancel-btn {
      color: ${theme.text};
      background-color: #fff;
      border: 1px solid ${theme.border};
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    .responsive-cancel-btn:hover {
      background-color: #f8fafc;
      border-color: #cbd5e1;
    }

    /* Desktop Overrides */
    @media (min-width: 768px) {
      .responsive-container {
        width: 100%;
        padding: 0 24px;
      }
      .responsive-header {
        flex-direction: row;
        align-items: center;
        padding-top: 32px;
      }
      .responsive-page-title {
        font-size: 30px;
        line-height: 36px;
      }
      .responsive-grid {
        grid-template-columns: 1fr 1fr; /* Balanced 2-column layout */
        gap: 32px;
      }
      .responsive-save-bar {
        bottom: 32px;
        min-width: auto;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }
    }
  `

    return (
        <div style={styles.page}>
            <style>{cssStyles}</style>
            {loading ? (
                <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <Loader />
                </div>
            ) : (
                <>
                    {/* Navbar */}
                    {/* Navbar */}
                    <Navbar user={employee} onLogout={onLogout} title="Details" />

                    <div className="responsive-container">
                        {/* Header */}
                        <div className="responsive-header">
                            <div style={styles.titleGroup}>
                                <h1 className="responsive-page-title">{employee?.name || "Employee Details"}</h1>
                                <p style={styles.pageSubtitle}>{employee?.role || "No role specified"} • {employee?.cluster || "No cluster"}</p>
                            </div>
                            {/* Back button could go here if needed, but Navbar handles nav mostly */}
                        </div>

                        {/* Global Error */}
                        {(error || dateError) && (
                            <div style={styles.errorBanner}>
                                {error || dateError}
                            </div>
                        )}

                        <div className="responsive-grid">
                            {/* Left Column: Professional Status */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                                <div className="responsive-card">
                                    <div style={styles.sectionTitle}>Professional Status</div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Current Project</label>
                                        {/* Custom Creatable Select */}
                                        <CreatableSelect
                                            options={allProjects}
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
                                                    type="checkbox" disabled
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
                                    <br></br>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Availability</label>
                                        <div onClick={() => !noCurrentProject && setShowHint(true)} onMouseLeave={() => setShowHint(false)}>
                                            <select
                                                className="modern-select"
                                                style={{ opacity: noCurrentProject ? 0.7 : 1 }}
                                                value={noCurrentProject ? "Available" : availability}
                                                onChange={(e) => setAvailability(e.target.value)}
                                                disabled={noCurrentProject}
                                            >
                                                <option value="Available" disabled={!noCurrentProject}>Available</option>
                                                <option value="Occupied">Occupied</option>
                                                <option value="Partially Available">Partially Available</option>
                                            </select>
                                        </div>
                                        {!noCurrentProject && showHint && (
                                            <div style={{ ...styles.helperText, color: theme.warning, transition: 'opacity 0.2s' }}>
                                                Requires "No current project" to be checked to select Available.
                                            </div>
                                        )}
                                    </div>

                                    {/* Partial Availability Details */}
                                    {!noCurrentProject && availability === "Partially Available" && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: `1px solid ${theme.border}` }}>
                                            <div style={styles.formGroup}>
                                                <label style={styles.label}>Hours Available (per day)</label>
                                                <select
                                                    className="modern-select"
                                                    value={hoursAvailable}
                                                    onChange={(e) => setHoursAvailable(e.target.value)}
                                                >
                                                    <option value="">Select Hours</option>
                                                    <option value="2">2 hours</option>
                                                    <option value="4">4 hours</option>
                                                    <option value="6">6 hours</option>
                                                    <option value="8">Full Day</option>
                                                </select>
                                                {errors.hours && <div style={{ color: theme.danger, fontSize: "13px" }}>{errors.hours}</div>}
                                            </div>

                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                                                <div style={{ ...styles.formGroup, flex: 1, minWidth: "140px" }}>
                                                    <label style={styles.label}>From Date</label>
                                                    <input
                                                        className="modern-input"
                                                        type="date"
                                                        value={fromDate}
                                                        onChange={(e) => handleFromDateChange(e.target.value)}
                                                        min={fromMin}
                                                        max={toDate || undefined}
                                                    />
                                                    {errors.fromDate && <div style={{ color: theme.danger, fontSize: "13px" }}>{errors.fromDate}</div>}
                                                </div>

                                                <div style={{ ...styles.formGroup, flex: 1, minWidth: "140px" }}>
                                                    <label style={styles.label}>To Date</label>
                                                    <input
                                                        className="modern-input"
                                                        type="date"
                                                        value={toDate}
                                                        onChange={(e) => handleToDateChange(e.target.value)}
                                                        min={toMin}
                                                        max={toMax}
                                                    />
                                                    {errors.toDate && <div style={{ color: theme.danger, fontSize: "13px" }}>{errors.toDate}</div>}
                                                </div>
                                            </div>
                                            <div style={styles.helperText}>
                                                Note: Weekends are disabled. Max duration is 1 year.
                                            </div>
                                        </div>
                                    )}
                                </div>


                                {/* Interests - Moved to Left Col */}
                                <div className="responsive-card">
                                    <div style={styles.sectionTitle}>Technical Interests</div>
                                    <div style={styles.formGroup}>
                                        <div style={styles.tagInputContainer}>
                                            <input
                                                id="interestInput"
                                                placeholder="Add an interest..."
                                                className="modern-input"
                                                style={styles.flexInput}
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

                            </div>

                            {/* Right Column: Skills, Interests & Previous Projects */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                                {/* Skills */}
                                <div className="responsive-card">
                                    <div style={styles.sectionTitle}>Skills</div>
                                    <div style={styles.formGroup}>
                                        <div style={styles.tagInputContainer}>
                                            <input
                                                id="skillInput"
                                                placeholder="Add a skill..."
                                                className="modern-input"
                                                style={styles.flexInput}
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

                                {/* Previous Projects - Moved to Right Col */}
                                <div className="responsive-card">
                                    <div style={styles.sectionTitle}>Previous Projects</div>
                                    <div style={styles.formGroup}>
                                        <div style={styles.tagInputContainer}>
                                            <div style={{ flex: 1 }}>
                                                <CreatableSelect
                                                    options={allProjects}
                                                    value={currentPreviousInput}
                                                    onChange={(e) => setCurrentPreviousInput(e.target.value)}
                                                    placeholder="Select or type project..."
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const val = currentPreviousInput.trim()
                                                    if (val) {
                                                        addPrevious(val)
                                                        setCurrentPreviousInput("")
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
                        </div>
                    </div>

                    {/* Fixed Save Bar */}
                    <div className="responsive-save-bar">
                        <button
                            className="responsive-cancel-btn"
                            onClick={() => onBack && onBack()}
                        >
                            Cancel
                        </button>
                        <button
                            className="responsive-save-btn"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? "Saving" : " Save "}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

