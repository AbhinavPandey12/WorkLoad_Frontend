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

  const CLUSTER_OPTIONS = [
    { label: "MEBM", value: "MEBM" },
    { label: "M&T", value: "M&T" },
    { label: "S&PS Insitu", value: "S&PS Insitu" },
    { label: "S&PS Exsitu", value: "S&PS Exsitu" },
  ]

  const [employee_id, setEmployeeId] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
   const [role, setRole] = useState("")
  const [otherRole, setOtherRole] = useState("")

  // Cluster States
  const [clusterMode, setClusterMode] = useState("") // "Single" or "Multiple"
  const [selectedClusters, setSelectedClusters] = useState([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const originalIdRef = React.useRef(null)

  // Initialize from prop
  useEffect(() => {
    if (!employee) return
    const id = employee.employee_id || ""
    originalIdRef.current = id

    setEmployeeId(id)
    setName(employee.name || "")
    setEmail(employee.email || "")
    setRole(employee.role || "")
    
    // Clusters Initialization
    const clusters = employee.clusters || [];
    setSelectedClusters(clusters);
    setClusterMode(clusters.length > 1 ? "Multiple" : "Single");
  }, [employee])

  // Non-destructive background refresh
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
          
          if (obj.clusters && obj.clusters.length > 0) {
            setSelectedClusters(obj.clusters);
            setClusterMode(obj.clusters.length > 1 ? "Multiple" : "Single");
          }

        } catch (e) {
          // silent error
        }
      })()
  }, [employee])

  // Validation
  const validateEmail = (v) => /^[a-zA-Z0-9.]+@workload\.com$/i.test(v)
  const errors = {
    name: !name.trim() ? "Name is required" : "",
    employee_id: !employee_id.toString().trim() ? "Employee Id required" : "",
    email: !validateEmail(email) ? "Email must end with @workload.com" : "",
    role: !role ? "Role required" : "",
    clusters: selectedClusters.length === 0 ? "Select at least one cluster" : (clusterMode === "Multiple" && selectedClusters.length < 2 ? "Select two clusters" : ""),
  }
  const isValid = () => !Object.values(errors).some(Boolean)

  const handleSave = async () => {
    setError("")
    if (!isValid()) return setError("Fix errors before saving.")

    const originalId = originalIdRef.current
    if (!originalId) return setError("Missing original employee ID.")

    setSaving(true)

    try {
      const payload = {
        name: name.trim(),
        employee_id: parseInt(employee_id),
        email: email.trim(),
        role: role === "Other" ? otherRole.trim() : role,
        clusters: selectedClusters.slice(0, 2),
        updated_at: new Date().toISOString(),
      }

      const base = API_URL.replace(/\/$/, "")
      const target = `${base}/api/employees/${encodeURIComponent(originalId)}`

      let res = await fetch(target, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Update failed with status ${res.status}`);
      }

      const updatedData = await res.json();
      const profileOnly = updatedData.data;

      // Merge into sessionStorage
      try {
        const existing = JSON.parse(sessionStorage.getItem("user") || "{}")
        sessionStorage.setItem("user", JSON.stringify({ ...existing, ...profileOnly }))
      } catch (e) {}

      setSaving(false)
      onSaveProfile && onSaveProfile(profileOnly)
      toast.success("Profile updated Successfully...")
    } catch (err) {
      setError(err.message || "Save failed")
      setSaving(false)
      toast.error(`Save failed: ${err.message}`)
    }
  }

  const toggleCluster = (val) => {
    if (clusterMode === "Single") {
      setSelectedClusters([val]);
    } else {
      if (selectedClusters.includes(val)) {
        setSelectedClusters(selectedClusters.filter(c => c !== val));
      } else if (selectedClusters.length < 2) {
        setSelectedClusters([...selectedClusters, val]);
      } else {
        // Replace second one or just ignore? Let's replace second.
        setSelectedClusters([selectedClusters[0], val]);
      }
    }
  };

  const IconStar = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )

  return (
    <div className="min-vh-100 bg-light">
      <Navbar user={employee} onLogout={onLogout} title="Profile" />

      <Container className="py-4">
        <Card className="shadow-sm border-0" style={{ borderRadius: "0px", maxWidth: "800px", margin: "0 auto" }}>
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
                  <Form.Control value={name} onChange={(e) => setName(e.target.value)} disabled className="rounded-0 shadow-none" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted">Employee ID</Form.Label>
                  <Form.Control value={employee_id} disabled className="rounded-0 shadow-none" />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted">Email</Form.Label>
                  <Form.Control value={email} disabled className="rounded-0 shadow-none" />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted">Role</Form.Label>
                  <Form.Select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-0 shadow-none">
                    <option value="">Select role</option>
                    {ROLE.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                {role === "Other" && (
                  <Form.Group className="mt-2">
                    <Form.Label className="fw-bold small text-muted">Please specify your role</Form.Label>
                    <Form.Control 
                      placeholder="Type your role..." 
                      value={otherRole} 
                      onChange={(e) => setOtherRole(e.target.value)} 
                      className="rounded-0 shadow-none"
                    />
                  </Form.Group>
                )}
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-bold small text-muted">Cluster Mode</Form.Label>
                  <div className="d-flex gap-3 mb-2">
                    <Form.Check 
                      type="radio" 
                      label="Single Cluster" 
                      name="clusterMode" 
                      checked={clusterMode === "Single"}
                      onChange={() => {
                        setClusterMode("Single");
                        setSelectedClusters(selectedClusters.slice(0, 1));
                      }}
                    />
                    <Form.Check 
                      type="radio" 
                      label="Multiple Clusters (Max 2)" 
                      name="clusterMode" 
                      checked={clusterMode === "Multiple"}
                      onChange={() => setClusterMode("Multiple")}
                    />
                  </div>
                  
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {CLUSTER_OPTIONS.map(opt => (
                      <Button
                        key={opt.value}
                        variant={selectedClusters.includes(opt.value) ? "primary" : "outline-secondary"}
                        size="sm"
                        className="rounded-pill px-3 shadow-none"
                        onClick={() => toggleCluster(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  {errors.clusters && <small className="text-danger">{errors.clusters}</small>}
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex justify-content-end mt-4">
              <Button
                className="fw-bold px-4 rounded-0"
                onClick={handleSave}
                disabled={saving}
                style={{ backgroundColor: "#0d6efd", border: "none" }}
              >
                {saving ? <Spinner animation="border" size="sm" /> : "Save Profile"}
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  )
}
