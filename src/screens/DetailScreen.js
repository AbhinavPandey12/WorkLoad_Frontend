import React, { useEffect, useState } from "react"
import { toast } from "react-toastify"

import Navbar from "../components/Navbar"
import { API_URL } from "../config"

import Loader from "../components/Loader"
import CreatableSelect from "../components/CreatableSelect"
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function DetailScreen({ employee = null, onBack, onSaveDetails, onLogout, onProfile }) {
    // ---------- LOGIC (Updated for Normalized Schema) ----------
    const [currentProject, setCurrentProject] = useState("")
    const [availability, setAvailability] = useState("Occupied")
    const [hoursAvailable, setHoursAvailable] = useState("")
    const [fromDate, setFromDate] = useState("")
    const [toDate, setToDate] = useState("")
    const [workingDays, setWorkingDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]) // Default all

    // Skills (Technical Interests are now Skills)
    const [skills, setSkills] = useState([])
    const [previousProjects, setPreviousProjects] = useState([]) 
    const [currentPreviousInput, setCurrentPreviousInput] = useState("")

    const [loading, setLoading] = useState(true)
    const [saving, setSavingState] = useState(false)
    const [error, setError] = useState("")
    const [dateError, setDateError] = useState("")

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

    // populate detail fields from employee prop
    useEffect(() => {
        if (!employee) return
                setCurrentProject(employee.current_project || "")

                setAvailability(employee.availability || "Occupied")
        setHoursAvailable(employee.hours_available || "")
        setFromDate(employee.from_date ? employee.from_date.split("T")[0] : "")
        setToDate(employee.to_date ? employee.to_date.split("T")[0] : "")
        
        const combined = [...new Set([...parseListField(employee.current_skills), ...parseListField(employee.interests)])]
        setSkills(combined)
        setPreviousProjects(parseListField(employee.previous_projects))
        if(employee.working_days) setWorkingDays(employee.working_days)
        setLoading(false)
    }, [employee])

    // background refresh
    useEffect(() => {
        if (!employee || !employee.employee_id) return
        const id = employee.employee_id
        const url = `${API_URL.replace(/\/$/, "")}/api/employees/${encodeURIComponent(id)}`
        ;(async () => {
            try {
                const res = await fetch(url)
                if (!res.ok) return
                const obj = await res.json()
                
                setCurrentProject(obj.current_project || "")
                setAvailability(obj.availability || "Occupied")
                setHoursAvailable(obj.hours_available || "")
                setFromDate(obj.from_date ? obj.from_date.split("T")[0] : "")
                setToDate(obj.to_date ? obj.to_date.split("T")[0] : "")
                
                const combined = [...new Set([...parseListField(obj.current_skills), ...parseListField(obj.interests)])]
                setSkills(combined)
                setPreviousProjects(parseListField(obj.previous_projects))
                if(obj.working_days) setWorkingDays(obj.working_days)
            } catch (e) {
                console.warn("DetailScreen background refresh failed:", e)
            }
        })()
    }, [employee])

    // Fetch Project Cache
    useEffect(() => {
        const fetchAllForDropdown = async () => {
            try {
                const urlProj = `${API_URL.replace(/\/$/, "")}/api/projects`
                const resProj = await fetch(urlProj)
                if (resProj.ok) {
                    const dataP = await resProj.json()
                    setAllProjects(dataP.map(p => p.project_name).filter(Boolean).sort())
                }
            } catch (e) {}
        }
        fetchAllForDropdown()
    }, [])

    const handleSave = async () => {
        setError("")
        if (!employee || !employee.employee_id) {
            setError("Missing employee_id — cannot save.")
            return
        }

        if (availability === "Partially Available" && !isValid()) {
            setError("Please fix validation errors.")
            return
        }

        setSavingState(true)
        try {
            const payload = {
                current_project: currentProject || "",
                availability: availability,
                hours_available: availability === "Partially Available" ? Number(hoursAvailable) : null,
                from_date: availability === "Partially Available" ? (fromDate || null) : null,
                to_date: availability === "Partially Available" ? (toDate || null) : null,
                current_skills: skills,
                working_days: workingDays,
                updated_at: new Date().toISOString(),
            }

            const base = API_URL.replace(/\/$/, "")
            const target = `${base}/api/employees/${encodeURIComponent(employee.employee_id)}`

            const res = await fetch(target, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || "Update failed")
            }

            const serverRecord = (await res.json()).data
            
            try {
                const existing = JSON.parse(sessionStorage.getItem("user") || "{}")
                sessionStorage.setItem("user", JSON.stringify({ ...existing, ...serverRecord }))
            } catch (e) {}

            onSaveDetails && onSaveDetails(serverRecord)
            toast.success("Details saved Successfully...")
        } catch (err) {
            setError(err.message || "Save failed")
            toast.error(`Save failed: ${err.message}`)
        } finally {
            setSavingState(false)
        }
    }

    const addSkill = (s) => {
        if (!s) return
        if (!skills.includes(s)) setSkills((prev) => [...prev, s])
    }
    const removeSkill = (s) => setSkills((prev) => prev.filter((x) => x !== s))

    const addPrevious = (p) => {
        if (!p) return
        if (!previousProjects.includes(p)) setPreviousProjects((prev) => [...prev, p])
    }
    const removePrevious = (p) => setPreviousProjects((prev) => prev.filter((x) => x !== p))

    const toggleWorkingDay = (day) => {
        setWorkingDays(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
    }

    // validation
    const errorsList = {
        hours: (availability === "Partially Available" && (!hoursAvailable || isNaN(Number(hoursAvailable)))) ? "Specify hours" : "",
        fromDate: (availability === "Partially Available" && !fromDate) ? "From date required" : "",
        toDate: (availability === "Partially Available" && !toDate) ? "To date required" : "",
    }
    const isValid = () => !Object.values(errorsList).some(Boolean) && !dateError

    // Styles...
    const theme = {
        primary: "#0f172a",
        secondary: "#334155",
        accent: "#4f46e5",
        accentHover: "#4338ca",
        bg: "#f8fafc",
        cardBg: "#ffffff",
        border: "#e2e8f0",
        text: "#1e293b",
        textMuted: "#64748b",
        danger: "#ef4444",
        success: "#22c55e",
        warning: "#f59e0b",
    }

    const styles = {
        page: { minHeight: "100vh", background: theme.bg, fontFamily: "'Inter', sans-serif", color: theme.text, paddingBottom: "100px" },
        titleGroup: { display: "flex", flexDirection: "column", gap: "4px" },
        pageSubtitle: { fontSize: "14px", color: theme.textMuted, margin: 0 },
        errorBanner: { background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", fontSize: "14px", border: "1px solid #fecaca" },
        sectionTitle: { fontSize: "18px", fontWeight: "600", color: theme.primary, marginBottom: "20px", paddingBottom: "12px", borderBottom: `1px solid ${theme.border}` },
        formGroup: { display: "flex", flexDirection: "column", gap: "10px" },
        label: { fontSize: "14px", fontWeight: "500", color: theme.secondary },
        checkboxWrapper: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" },
        checkbox: { accentColor: theme.accent, width: "16px", height: "16px" },
        checkboxLabel: { fontSize: "14px", color: theme.text },
        tagInputContainer: { display: "flex", gap: "10px", marginBottom: "5px" },
        flexInput: { flex: 1, minWidth: 0, width: "auto" },
        addBtn: { padding: "0 16px", borderRadius: "10px", background: theme.bg, border: `1px solid ${theme.border}`, color: "#6ea8fe", fontWeight: "600", fontSize: "14px", cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" },
        tagsWrapper: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" },
        tag: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", background: "#e0f2fe", color: "#0369a1", fontSize: "14px", fontWeight: "500", border: "1px solid #bae6fd" },
        removeTagBtn: { border: "none", background: "transparent", color: "#0369a1", cursor: "pointer", padding: "0", marginLeft: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", lineHeight: 1, opacity: 0.7 },
        helperText: { fontSize: "13px", color: theme.textMuted, marginTop: "4px" },
        workingDaysWrapper: { display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }
    }

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

    const cssStyles = `
    * { box-sizing: border-box; }
    .modern-input, .modern-select, .modern-textarea {
      display: block; width: 100%; padding: 10px 12px; font-size: 14px;
      color: ${theme.text}; background-color: #fff; border: 1px solid ${theme.border};
      border-radius: 6px; transition: border-color .15s ease-in-out;
    }
    .modern-input:focus, .modern-select:focus { border-color: ${theme.accent}; outline: 0; }
    .modern-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 16px 12px; }
    .responsive-container { max-width: 1000px; margin: 0 auto; width: 92%; padding-top: 20px; }
    .responsive-card { background: #fff; border: 1px solid ${theme.border}; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .responsive-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 768px) { .responsive-grid { grid-template-columns: 1fr; } }
    .responsive-save-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid ${theme.border}; padding: 16px; display: flex; justify-content: flex-end; gap: 12px; z-index: 100; }
    .responsive-save-btn { background: #6ea8fe; color: #052c65; border: none; padding: 8px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; }
    .responsive-cancel-btn { background: #fff; border: 1px solid ${theme.border}; padding: 8px 24px; border-radius: 6px; cursor: pointer; }
    .day-btn { padding: 6px 12px; border: 1px solid ${theme.border}; border-radius: 20px; background: #fff; cursor: pointer; font-size: 13px; }
    .day-btn.active { background: ${theme.accent}; color: #fff; border-color: ${theme.accent}; }
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
                    <Navbar user={employee} onLogout={onLogout} title="Details" />

                    <div className="responsive-container">
                        <div className="responsive-header">
                            <div style={styles.titleGroup}>
                                <h1 className="responsive-page-title">{employee?.name || "Employee Details"}</h1>
                                <p style={styles.pageSubtitle}>{employee?.role || "No role specified"} • {employee?.clusters?.join(", ") || "No cluster"}</p>
                            </div>
                        </div>

                        {(error || dateError) && <div style={styles.errorBanner}>{error || dateError}</div>}

                        <div className="responsive-grid">
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <div className="responsive-card">
                                    <div style={styles.sectionTitle}>Professional Status</div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Current Project</label>
                                        <CreatableSelect
                                            options={allProjects}
                                            value={currentProject}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                setCurrentProject(val)
                                                if (val && availability === "Available") setAvailability("Occupied")
                                            }}
                                            placeholder="e.g. Project Alpha"
                                        />
                                    </div>
                                    <div style={{...styles.formGroup, marginTop: "20px"}}>
                                        <label style={styles.label}>Availability</label>
                                        <select
                                            className="modern-select"
                                            value={availability}
                                            onChange={(e) => setAvailability(e.target.value)}
                                        >
                                            <option value="Available">Available</option>
                                            <option value="Occupied">Occupied</option>
                                            <option value="Partially Available">Partially Available</option>
                                        </select>
                                    </div>

                                    {availability === "Partially Available" && (
                                        <div style={{ marginTop: "20px", padding: "16px", background: "#f8fafc", borderRadius: "8px", border: `1px solid ${theme.border}` }}>
                                            <div style={styles.formGroup}>
                                                <label style={styles.label}>Hours Available (per day)</label>
                                                <select className="modern-select" value={hoursAvailable} onChange={(e) => setHoursAvailable(e.target.value)}>
                                                    <option value="">Select Hours</option>
                                                    {[2,4,6,8].map(h => <option key={h} value={h}>{h} hours {h===8?'(Full Day)':''}</option>)}
                                                </select>
                                                {errorsList.hours && <div style={{ color: theme.danger, fontSize: "12px" }}>{errorsList.hours}</div>}
                                            </div>
                                            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={styles.label}>From Date</label>
                                                    <DatePicker
                                                        selected={fromDate ? new Date(fromDate) : null}
                                                        onChange={(date) => {
                                                            if (date) {
                                                                const offset = date.getTimezoneOffset()
                                                                const localDate = new Date(date.getTime() - (offset * 60 * 1000))
                                                                const val = localDate.toISOString().split('T')[0]
                                                                handleFromDateChange(val)
                                                            } else {
                                                                handleFromDateChange("")
                                                            }
                                                        }}
                                                        dateFormat="yyyy-MM-dd"
                                                        className="modern-input"
                                                        placeholderText="YYYY-MM-DD"
                                                        minDate={new Date(fromMin)}
                                                        filterDate={(date) => {
                                                            const day = date.getDay();
                                                            return day !== 0 && day !== 6;
                                                        }}
                                                        wrapperClassName="w-100"
                                                    />
                                                    {errorsList.fromDate && <div style={{ color: theme.danger, fontSize: "12px" }}>{errorsList.fromDate}</div>}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={styles.label}>To Date</label>
                                                    <DatePicker
                                                        selected={toDate ? new Date(toDate) : null}
                                                        onChange={(date) => {
                                                            if (date) {
                                                                const offset = date.getTimezoneOffset()
                                                                const localDate = new Date(date.getTime() - (offset * 60 * 1000))
                                                                const val = localDate.toISOString().split('T')[0]
                                                                handleToDateChange(val)
                                                            } else {
                                                                handleToDateChange("")
                                                            }
                                                        }}
                                                        dateFormat="yyyy-MM-dd"
                                                        className="modern-input"
                                                        placeholderText="YYYY-MM-DD"
                                                        minDate={new Date(toMin)}
                                                        maxDate={toMax ? new Date(toMax) : null}
                                                        filterDate={(date) => {
                                                            const day = date.getDay();
                                                            return day !== 0 && day !== 6;
                                                        }}
                                                        wrapperClassName="w-100"
                                                    />
                                                    {errorsList.toDate && <div style={{ color: theme.danger, fontSize: "12px" }}>{errorsList.toDate}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="responsive-card">
                                    <div style={styles.sectionTitle}>Working Days</div>
                                    <div style={styles.workingDaysWrapper}>
                                        {["Mon", "Tue", "Wed", "Thu", "Fri"].map(day => (
                                            <button
                                                key={day}
                                                className={`day-btn ${workingDays.includes(day) ? 'active' : ''}`}
                                                onClick={() => toggleWorkingDay(day)}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                    <div style={styles.helperText}>Select the days you are active.</div>
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <div className="responsive-card">
                                    <div style={styles.sectionTitle}>Technical Skills</div>
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
                                            <button type="button" onClick={() => {
                                                const el = document.getElementById("skillInput")
                                                if (el && el.value.trim()) { addSkill(el.value.trim()); el.value = ""; }
                                            }} style={styles.addBtn}>Add</button>
                                        </div>
                                        <div style={styles.tagsWrapper}>
                                            {skills.map(s => (
                                                <div key={s} style={styles.tag}>
                                                    {s}
                                                    <button onClick={() => removeSkill(s)} style={styles.removeTagBtn}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

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
                                            <button type="button" onClick={() => {
                                                const val = currentPreviousInput.trim()
                                                if (val) { addPrevious(val); setCurrentPreviousInput(""); }
                                            }} style={styles.addBtn}>Add</button>
                                        </div>
                                        <div style={styles.tagsWrapper}>
                                            {previousProjects.map(p => (
                                                <div key={p} style={styles.tag}>
                                                    {p}
                                                    <button onClick={() => removePrevious(p)} style={styles.removeTagBtn}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="responsive-save-bar">
                        <button className="responsive-cancel-btn" onClick={() => onBack && onBack()}>Cancel</button>
                        <button className="responsive-save-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Details"}</button>
                    </div>
                </>
            )}
        </div>
    )
}

