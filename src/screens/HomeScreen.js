// Frontend/src/screens/HomeScreen.js
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import EmployeeCard from "../components/EmployeeCard"
import Navbar from "../components/Navbar"
import { API_URL } from "../config"

export default function HomeScreen({ onLogout, employee }) {
  const navigate = useNavigate()

  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [availabilityFilter, setAvailabilityFilter] = useState("All")
  const [availabilityRange, setAvailabilityRange] = useState("Any") // Any / Today / This Week / This Month
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")



  // mobile detection for responsive inline styles (<= 900px treated as mobile/tablet breakpoint adjustable)
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900)
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [])



  const fetchEmployees = async () => {
    try {
      console.log("[v0] Fetching employees from:", `${API_URL}/api/employees`)
      const response = await fetch(`${API_URL}/api/employees`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      console.log("[v0] Employees response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch employees`)
      }

      const data = await response.json()
      console.log("[v0] Employees fetched successfully:", data.length, "items")

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const updatesToSync = []

      // Filter out Managers AND apply expiry logic
      const sanitizedData = data
        .filter(emp => (emp.role_type || "").toLowerCase() !== "manager") // Exclude Managers
        .map((emp) => {
          const av = (emp.availability || "").toLowerCase()
          if (av === "partially available" || av.includes("partial")) {
            if (emp.to_date) {
              try {
                const datePart = emp.to_date.toString().split("T")[0].split(" ")[0]
                const [y, m, d] = datePart.split("-").map((s) => parseInt(s, 10))
                const toDateObj = new Date(y, m - 1, d)
                // If toDate is strictly before today, it's expired
                if (toDateObj < today) {
                  // Mark for DB update
                  updatesToSync.push(emp)
                  return { ...emp, availability: "Occupied" }
                }
              } catch (e) {
                // ignore parse errors
              }
            }
          }
          return emp
        })

      setEmployees(sanitizedData)
      setFilteredEmployees(sanitizedData)
      setError("")

      // Background sync: Update DB for expired records
      if (updatesToSync.length > 0) {
        console.log("[v0] Found expired records to sync:", updatesToSync.length)
        Promise.allSettled(updatesToSync.map(emp => {
          const url = `${API_URL}/api/employees/${emp.empid || emp.id}`
          return fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              availability: "Occupied",
              updated_at: new Date().toISOString()
            })
          }).then(res => {
            if (res.ok) console.log(`[v0] Auto-expired emp ${emp.empid}`)
            else console.warn(`[v0] Failed to auto-expire emp ${emp.empid}`)
          })
        }))
      }
    } catch (err) {
      console.error("[v0] Employee fetch error:", err)
      setError(`Failed to load employees: ${err.message}. Make sure backend is running on ${API_URL}`)
    } finally {
      setLoading(false)
    }
  }

  // -------------------------
  // Date helpers for ranges
  // -------------------------
  const parseDateOnly = (d) => {
    if (!d) return null
    try {
      const datePart = d.toString().split("T")[0].split(" ")[0]
      const [y, m, day] = datePart.split("-").map((s) => parseInt(s, 10))
      if (!y || !m || !day) return null
      return new Date(y, m - 1, day)
    } catch {
      return null
    }
  }

  const startOfToday = () => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), t.getDate())
  }
  const endOfToday = () => {
    const s = startOfToday()
    return new Date(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59, 59, 999)
  }
  const startOfWeek = () => {
    const t = startOfToday()
    const day = t.getDay()
    const diff = (day === 0 ? -6 : 1 - day) // monday start
    const d = new Date(t)
    d.setDate(t.getDate() + diff)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  const endOfWeek = () => {
    const s = startOfWeek()
    const d = new Date(s)
    d.setDate(s.getDate() + 6)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  }
  const startOfMonth = () => {
    const t = startOfToday()
    return new Date(t.getFullYear(), t.getMonth(), 1)
  }
  const endOfMonth = () => {
    const t = startOfToday()
    return new Date(t.getFullYear(), t.getMonth() + 1, 0, 23, 59, 59, 999)
  }
  const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
    if (!aStart || !aEnd || !bStart || !bEnd) return false
    return aStart <= bEnd && bStart <= aEnd
  }

  // -------------------------
  // Availability logic (STRICTER)
  // -------------------------
  const isEmployeeAvailableInRange = (emp, rangeKey) => {
    if (!emp) return false
    const av = (emp.availability || "").toString().toLowerCase()

    if (rangeKey === "Any" || rangeKey === "any") return true
    if (av === "Occupied") return false

    if (av === "available") {
      const from = parseDateOnly(emp.from_date)
      const to = parseDateOnly(emp.to_date)
      if (!from || !to) return true // no explicit window => treat as always-available
      let rStart, rEnd
      if (rangeKey === "Today") {
        rStart = startOfToday(); rEnd = endOfToday()
      } else if (rangeKey === "This Week") {
        rStart = startOfWeek(); rEnd = endOfWeek()
      } else if (rangeKey === "This Month") {
        rStart = startOfMonth(); rEnd = endOfMonth()
      } else {
        return true
      }
      return rangesOverlap(from, to, rStart, rEnd)
    }

    if (av === "partially available" || av.includes("partial")) {
      const from = parseDateOnly(emp.from_date)
      const to = parseDateOnly(emp.to_date)
      // strict: require both dates
      if (!from || !to) return false
      let rStart, rEnd
      if (rangeKey === "Today") {
        rStart = startOfToday(); rEnd = endOfToday()
      } else if (rangeKey === "This Week") {
        rStart = startOfWeek(); rEnd = endOfWeek()
      } else if (rangeKey === "This Month") {
        rStart = startOfMonth(); rEnd = endOfMonth()
      } else {
        return false
      }
      return rangesOverlap(from, to, rStart, rEnd)
    }

    return false
  }

  // -------------------------
  // Filtering effect
  // -------------------------
  useEffect(() => {
    let filtered = employees || []

    // search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter((emp) =>
        (emp.name && emp.name.toLowerCase().startsWith(lowerSearch)) ||
        (emp.current_skills && Array.isArray(emp.current_skills) && emp.current_skills.some((skill) => skill.toLowerCase().startsWith(lowerSearch))) ||
        (emp.role && emp.role.toLowerCase().startsWith(lowerSearch))
      )
    }

    // availability filter (Exact match on availability string)
    if (availabilityFilter !== "All") {
      filtered = filtered.filter((emp) => (emp.availability || "") === availabilityFilter)
    }

    // availability range filtering: apply unless availabilityFilter === "Occupied"
    const applyRange = availabilityFilter !== "Occupied"
    if (applyRange && availabilityRange && availabilityRange !== "Any") {
      filtered = filtered.filter((emp) => isEmployeeAvailableInRange(emp, availabilityRange))
    }

    setFilteredEmployees(filtered)
  }, [searchTerm, availabilityFilter, availabilityRange, employees])

  // Keep same initials logic as EmployeeCard
  const getInitials = (name) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
  }

  // Color generator same as EmployeeCard (keeps avatar consistent)
  const getInitialsColor = (nm) => {
    const colors = ["#0072bc", "#d32f2f", "#2e7d32", "#f57c00", "#7b1fa2"]
    const n = (nm || " ").toString()
    let hash = 0
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const styles = {
    container: {
      padding: isMobile ? "12px" : "15px",
      fontFamily: "Segoe UI, Tahoma, sans-serif",
      background: "#f5f5f5",
      minHeight: "100vh",
    },
    controls: {
      background: "white",
      padding: isMobile ? "12px" : "20px",
      borderRadius: "8px",
      marginBottom: "20px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
    // desktop/tablet: single inline row for search+filters
    desktopSearchBox: {
      display: "flex",
      gap: "10px",
      alignItems: "center",
      flexWrap: "nowrap",
      width: "100%",
    },
    // mobile: two rows (searchRow + filtersRow)
    searchRow: {
      display: "flex",
      gap: "10px",
      marginBottom: 10,
      alignItems: "center",
      flexWrap: "nowrap",
    },
    filtersRow: {
      display: "flex",
      gap: "10px",
      alignItems: "center",
      flexWrap: "nowrap",
      overflowX: "auto",
    },
    input: {
      flex: 1,
      minWidth: isMobile ? "160px" : "280px",
      padding: isMobile ? "8px 10px" : "10px 12px",
      borderRadius: "6px",
      border: "1px solid #ddd",
      fontSize: 14,
      fontFamily: "inherit",
    },
    smallSelect: {
      padding: isMobile ? "8px 10px" : "10px 12px",
      borderRadius: "6px",
      border: "1px solid #ddd",
      fontSize: 14,
      fontFamily: "inherit",
      minWidth: isMobile ? 130 : 150,
      whiteSpace: "nowrap",
    },
    smallSelectDisabled: {
      padding: isMobile ? "8px 10px" : "10px 12px",
      borderRadius: "6px",
      border: "1px solid #eee",
      fontSize: 14,
      fontFamily: "inherit",
      minWidth: isMobile ? 130 : 150,
      whiteSpace: "nowrap",
      opacity: 0.6,
      cursor: "not-allowed",
      background: "#fafafa",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "20px",
    },
    noResults: {
      textAlign: "center",
      padding: "40px 20px",
      color: "#999",
      fontSize: 16,
    },
    errorBox: {
      background: "#ffebee",
      color: "#d32f2f",
      padding: "15px",
      borderRadius: "8px",
      marginBottom: "20px",
      fontSize: 14,
    },
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.noResults}>Loading employees...</div>
      </div>
    )
  }

  // derive initials / color for the profile avatar
  const profileName = (employee && (employee.name || "")) || (employees[0] && employees[0].name) || "User"
  const profileInitials = getInitials(profileName)
  const profileBg = getInitialsColor(profileName)

  // range applicable for all except Occupied
  const rangeApplicable = availabilityFilter !== "Occupied"

  return (
    <div style={styles.container}>
      <Navbar user={employee} onLogout={onLogout} title="Employee Dashboard" />

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.controls}>
        {/* Desktop/tablet: put search and selects inline in a single row */}
        {!isMobile ? (
          <div style={styles.desktopSearchBox}>
            <input
              style={styles.input}
              type="text"
              placeholder="Search by name, skill or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              style={styles.smallSelect}
              value={availabilityFilter}
              onChange={(e) => {
                const val = e.target.value
                setAvailabilityFilter(val)
                if (val === "Occupied") setAvailabilityRange("Any")
              }}
            >
              <option value="All">All Availability</option>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Partially Available">Partially Available</option>
            </select>

            <select
              style={rangeApplicable ? styles.smallSelect : styles.smallSelectDisabled}
              value={availabilityRange}
              onChange={(e) => setAvailabilityRange(e.target.value)}
              disabled={!rangeApplicable}
              title={rangeApplicable ? "Filter by time range" : "Select a status other than 'Occupied' to enable"}
            >
              <option value="Any">Any time</option>
              <option value="Today">Available today</option>
              <option value="This Week">Available this week</option>
              <option value="This Month">Available this month</option>
            </select>
          </div>
        ) : (
          <>
            {/* Mobile: search row then filters row */}
            <div style={styles.searchRow}>
              <input
                style={styles.input}
                type="text"
                placeholder="Search by name, skill or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={styles.filtersRow}>
              <select
                style={styles.smallSelect}
                value={availabilityFilter}
                onChange={(e) => {
                  const val = e.target.value
                  setAvailabilityFilter(val)
                  if (val === "Occupied") setAvailabilityRange("Any")
                }}
              >
                <option value="All">All Availability</option>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Partially Available">Partially Available</option>
              </select>

              <select
                style={rangeApplicable ? styles.smallSelect : styles.smallSelectDisabled}
                value={availabilityRange}
                onChange={(e) => setAvailabilityRange(e.target.value)}
                disabled={!rangeApplicable}
                title={rangeApplicable ? "Filter by time range" : "Select a status other than 'Occupied' to enable"}
              >
                <option value="Any">Any time</option>
                <option value="Today">Available today</option>
                <option value="This Week">Available this week</option>
                <option value="This Month">Available this month</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div style={styles.grid}>
        {filteredEmployees.length > 0 ? (
          filteredEmployees.map((emp) => (
            <EmployeeCard
              key={emp.empid || emp.id || emp.name}
              employee={emp}
              getInitials={getInitials}
              currentUser={employee}
              onRefresh={fetchEmployees}
            />
          ))
        ) : (
          <div style={styles.noResults}>
            {employees.length === 0 ? "No employees available" : "No employees match your search"}
          </div>
        )}
      </div>
    </div>
  )
}
