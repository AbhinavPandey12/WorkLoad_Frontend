// Frontend/src/screens/ProfileScreen.js
// Frontend/src/screens/ProfileScreen.js
import React, { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from "react-bootstrap";
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
    { label: "Multiple", value: "Multiple" },
  ]

  const [empid, setEmpid] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("")
  const [otherRole, setOtherRole] = useState("")

  // Cluster States
  const [clusterMode, setClusterMode] = useState("") // "MEBM", "Multiple", etc.
  const [cluster1, setCluster1] = useState("")
  const [cluster2, setCluster2] = useState("")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")




  const originalIdRef = React.useRef(null)


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

    // Cluster Initialization
    if (employee.cluster2) {
      setClusterMode("Multiple")
      setCluster1(employee.cluster || "")
      setCluster2(employee.cluster2)
    } else {
      setClusterMode(employee.cluster || "")
      setCluster1(employee.cluster || "")
      setCluster2("")
    }
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

          // Cluster refresh logic
          if (obj.cluster2) {
            setClusterMode(cur => cur ? cur : "Multiple")
            setCluster1(cur => cur ? cur : (obj.cluster || ""))
            setCluster2(cur => cur ? cur : obj.cluster2)
          } else {
            setClusterMode(cur => cur ? cur : (obj.cluster || ""))
            setCluster1(cur => cur ? cur : (obj.cluster || ""))
          }

        } catch (e) {
          // console.warn("Profile refresh failed:", e)
        }
      })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee])

  // Validation
  const validateEmail = (v) => /^[a-zA-Z0-9]+\.[a-zA-Z0-9]+@workload\.com$/i.test(v)
  const errors = {
    name: !name.trim() ? "Name is required" : "",
    empid: !empid.toString().trim() ? "Employee Id required" : "",
    email: !validateEmail(email) ? "Email format Incorrect" : "",
    role: !role ? "Role required" : "",
    otherRole: role === "Other" && !otherRole.trim() ? "Enter role" : "",
    cluster: !clusterMode ? "Cluster required" : (clusterMode === "Multiple" && (!cluster1 || !cluster2) ? "Both clusters required" : ""),
  }
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
    // setTouched({ name: true, empid: true, email: true, role: true, otherRole: true, cluster: true })
    setError("")

    if (!isValid()) return setError("Fix errors before saving.")

    const originalId = originalIdRef.current
    if (!originalId) return setError("Missing original employee ID.")

    setSaving(true)

    try {
      // Determine final cluster values
      let finalCluster = clusterMode === "Multiple" ? cluster1 : clusterMode;
      let finalCluster2 = clusterMode === "Multiple" ? cluster2 : null;

      const payload = {
        name: name.trim(),
        empid: empid.toString().trim(),
        email: email.trim(),
        role: role === "Other" ? otherRole.trim() : role,
        otherRole: role === "Other" ? otherRole.trim() : "",
        cluster: finalCluster,
        cluster2: finalCluster2,
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
      await readResponse(res)


      if (!res.ok) {
        throw new Error(`Update failed with status ${res.status}`)
      }

      // Confirm by fetching server record (prefer new empid then original)
      let serverRecord = await fetchServerRecord(payload.empid)
      if (!serverRecord) serverRecord = await fetchServerRecord(originalId)
      if (!serverRecord) throw new Error("Could not fetch record after save — check backend.")

      // Build profile-only object using serverRecord fields (non-destructive)
      const profileKeys = ["empid", "name", "email", "role", "otherRole", "cluster", "cluster2", "updated_at"]
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
        // console.warn("sessionStorage merge failed:", e)
      }

      // Update state and notify parent
      setSaving(false)
      onSaveProfile && onSaveProfile(profileOnly)
      toast.success("Profile updated Successfully...")
    } catch (err) {
      // console.error("[ProfileScreen] Save error:", err)
      setError(err.message || "Save failed — check console/network")
      setSaving(false)
      toast.error(`Save failed: ${err.message}. See console/network tab.`)
    }
  }

  // Star Icon Component
  /* Star Icon (Lucide Standard) */
  const IconStar = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )

  return (
    <div className="min-vh-100 bg-light">
      <Navbar user={employee} onLogout={onLogout} title="Profile" />

      {/* Hidden uploaded screenshot path (developer requested path) */}
      <img src="/mnt/data/5438abe0-f333-4e41-8233-b5ea2387a27d.png" alt="hidden" style={{ display: "none" }} />

      <Container className="py-4">
        <Card className="shadow-sm border-0" style={{ borderRadius: "0px", maxWidth: "1100px", margin: "0 auto" }}>
          <Card.Header className="bg-white border-bottom pt-4 pb-3 d-flex justify-content-between align-items-center w-100">
            <div className="d-flex align-items-center gap-2 bg-light border border-warning rounded-pill px-3 py-1">
              <span className="fw-bold text-dark fs-5" style={{ color: "#d97706" }}>{employee?.stars || 0}</span>
              <IconStar />
            </div>

            {onBack && (
              <Button
                variant="light"
                onClick={onBack}
                className="px-3 rounded-0 border text-secondary fw-bold"
                style={{ background: "#f8f9fa" }}
              >
                ← Back
              </Button>
            )}

          </Card.Header>
          <Card.Body className="p-4">
            {error && <Alert variant="danger" className="mb-4 rounded-0">{error}</Alert>}

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted">Full Name</Form.Label>
                  <Form.Control value={name} onChange={(e) => setName(e.target.value)} disabled className="rounded-0" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted">Employee ID</Form.Label>
                  <Form.Control value={empid} onChange={(e) => setEmpid(e.target.value)} disabled className="rounded-0" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted">Email</Form.Label>
                  <Form.Control value={email} onChange={(e) => setEmail(e.target.value)} disabled className="rounded-0" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted">Role</Form.Label>
                  <Form.Select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-0">
                    <option value="">Select role</option>
                    {ROLE.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              {role === "Other" && (
                <Col md={12}>
                  <Form.Group>
                    <Form.Label className="fw-bold small text-muted">Specify Role</Form.Label>
                    <Form.Control value={otherRole} onChange={(e) => setOtherRole(e.target.value)} className="rounded-0" />
                  </Form.Group>
                </Col>
              )}

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted">Cluster</Form.Label>
                  <Form.Select
                    value={clusterMode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClusterMode(val);
                      if (val !== "Multiple") {
                        setCluster1(val);
                        setCluster2("");
                      } else {
                        if (clusterMode !== "Multiple" && clusterMode) {
                          setCluster1(clusterMode);
                        }
                      }
                    }}
                    className="rounded-0"
                  >
                    <option value="">Select cluster</option>
                    {CLUSTER.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              {clusterMode === "Multiple" && (
                <>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold small text-muted">Cluster 1</Form.Label>
                      <Form.Select value={cluster1} onChange={(e) => setCluster1(e.target.value)} className="rounded-0">
                        <option value="">Select Cluster 1</option>
                        {CLUSTER.filter(c => c.value !== "Multiple").map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold small text-muted">Cluster 2</Form.Label>
                      <Form.Select value={cluster2} onChange={(e) => setCluster2(e.target.value)} className="rounded-0">
                        <option value="">Select Cluster 2</option>
                        {CLUSTER.filter(c => c.value !== "Multiple" && c.value !== cluster1).map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </>
              )}
            </Row>

            <div className="d-flex justify-content-end mt-4">
              <button
                className="btn fw-bold px-4"
                onClick={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: "#6ea8fe",
                  color: "#052c65",
                  borderRadius: "0px",
                  border: "none"
                }}
              >
                {saving ? <Spinner animation="border" size="sm" /> : "Save Profile"}
              </button>
            </div>

          </Card.Body>
        </Card>
      </Container>
    </div>
  )
}
