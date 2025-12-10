// Frontend/src/screens/HomeScreen.js
import { useState, useEffect } from "react"
import EmployeeCard from "../components/EmployeeCard"
import Navbar from "../components/Navbar"
import { API_URL } from "../config"
import Loader from "../components/Loader"
import { Container, Row, Col, Form, Card, Alert } from "react-bootstrap";

export default function HomeScreen({ onLogout, employee }) {

  const [employees, setEmployees] = useState([])
  const [filteredEmployees, setFilteredEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [availabilityFilter, setAvailabilityFilter] = useState("All")
  const [availabilityRange, setAvailabilityRange] = useState("Any") // Any / Today / This Week / This Month
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_URL}/api/employees`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch employees`)
      }

      const data = await response.json()

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const updatesToSync = []

      // Filter out Managers AND apply expiry logic
      const sanitizedData = data
        .filter(emp => (emp.role_type || "").toLowerCase() !== "manager")
        .map((emp) => {
          const av = (emp.availability || "").toLowerCase()
          if (av === "partially available" || av.includes("partial")) {
            if (emp.to_date) {
              try {
                const datePart = emp.to_date.toString().split("T")[0].split(" ")[0]
                const [y, m, d] = datePart.split("-").map((s) => parseInt(s, 10))
                const toDateObj = new Date(y, m - 1, d)
                if (toDateObj < today) {
                  updatesToSync.push(emp)
                  return { ...emp, availability: "Occupied" }
                }
              } catch (e) { }
            }
          }
          return emp
        })

      setEmployees(sanitizedData)
      setFilteredEmployees(sanitizedData)
      setError("")

      if (updatesToSync.length > 0) {
        Promise.allSettled(updatesToSync.map(emp => {
          const url = `${API_URL}/api/employees/${emp.empid || emp.id}`
          return fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              availability: "Occupied",
              updated_at: new Date().toISOString()
            })
          })
        }))
      }
    } catch (err) {
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
  // Availability logic
  // -------------------------
  const isEmployeeAvailableInRange = (emp, rangeKey) => {
    if (!emp) return false
    const av = (emp.availability || "").toString().toLowerCase()

    if (rangeKey === "Any" || rangeKey === "any") return true
    if (av === "Occupied") return false

    if (av === "available") {
      const from = parseDateOnly(emp.from_date)
      const to = parseDateOnly(emp.to_date)
      if (!from || !to) return true
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

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter((emp) =>
        (emp.name && emp.name.toLowerCase().startsWith(lowerSearch)) ||
        (emp.current_skills && Array.isArray(emp.current_skills) && emp.current_skills.some((skill) => skill.toLowerCase().startsWith(lowerSearch))) ||
        (emp.role && emp.role.toLowerCase().startsWith(lowerSearch))
      )
    }

    if (availabilityFilter !== "All") {
      filtered = filtered.filter((emp) => (emp.availability || "") === availabilityFilter)
    }

    const applyRange = availabilityFilter !== "Occupied"
    if (applyRange && availabilityRange && availabilityRange !== "Any") {
      filtered = filtered.filter((emp) => isEmployeeAvailableInRange(emp, availabilityRange))
    }

    filtered.sort((a, b) => {
      const idA = a.empid || a.id || 0;
      const idB = b.empid || b.id || 0;
      return idA > idB ? 1 : -1;
    });

    setFilteredEmployees(filtered)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, availabilityFilter, availabilityRange, employees]);

  // Project Cache
  const [dbProjects, setDbProjects] = useState([])
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`${API_URL}/api/projects`)
        if (res.ok) {
          const data = await res.json()
          const names = data.map(p => p.project_name).filter(Boolean)
          setDbProjects(names)
        }
      } catch (e) {
        console.warn("Failed to fetch project cache:", e)
      }
    }
    fetchProjects()
  }, [])

  const allProjects = Array.from(
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

  const getInitials = (name) => {
    if (!name) return "U"
    return name.split(" ").map((word) => word[0]).join("").toUpperCase()
  }

  const rangeApplicable = availabilityFilter !== "Occupied"

  if (loading) {
    return (
      <div className="vh-100 d-flex justify-content-center align-items-center">
        <Loader />
      </div>
    )
  }

  return (
    <div className="min-vh-100 bg-light">
      <div className="sticky-top">
        <Navbar user={employee} onLogout={onLogout} title="Employee Directory" />
      </div>

      <Container fluid className="py-4">
        {error && <Alert variant="danger">{error}</Alert>}

        <Card className="mb-4 shadow-sm border-0" style={{ borderRadius: "8px" }}>
          <Card.Body className="p-3">
            <Row className="g-3 align-items-center">
              <Col xs={12} lg>
                <Form.Control
                  type="text"
                  placeholder="Search by name, skill or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Col>

              <Col xs={12} sm={6} lg="auto">
                <Form.Select
                  value={availabilityFilter}
                  onChange={(e) => {
                    const val = e.target.value
                    setAvailabilityFilter(val)
                    if (val === "Occupied") setAvailabilityRange("Any")
                  }}
                  style={{ width: "100%" }}
                >
                  <option value="All">All Availability</option>
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Partially Available">Partially Available</option>
                </Form.Select>
              </Col>

              <Col xs={12} sm={6} lg="auto">
                <Form.Select
                  value={availabilityRange}
                  onChange={(e) => setAvailabilityRange(e.target.value)}
                  disabled={!rangeApplicable}
                  title={rangeApplicable ? "Filter by time range" : "Select a status other than 'Occupied' to enable"}
                  style={{ width: "100%" }}
                >
                  <option value="Any">Any time</option>
                  <option value="Today">Available today</option>
                  <option value="This Week">Available this week</option>
                  <option value="This Month">Available this month</option>
                </Form.Select>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Row className="g-4">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp) => (
              <Col key={emp.empid || emp.id || emp.name} xs={12} md={6} lg={4} xl={3}>
                <EmployeeCard
                  employee={emp}
                  getInitials={getInitials}
                  currentUser={employee}
                  onRefresh={fetchEmployees}
                  allProjects={allProjects}
                />
              </Col>
            ))
          ) : (
            <div className="text-center py-5 text-muted">
              {employees.length === 0 ? "No employees available" : "No employees match your search"}
            </div>
          )}
        </Row>
      </Container>
    </div>
  )
}
