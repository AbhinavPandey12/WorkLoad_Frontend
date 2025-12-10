import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { API_URL } from "../config"
import Navbar from "../components/Navbar"
import Loader from "../components/Loader"
import CreatableSelect from "../components/CreatableSelect"
import { Container, Row, Col, Card, Form, Button, Table, Spinner, Modal } from "react-bootstrap"

export default function ActivitiesScreen({ onLogout }) {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)

    const initialFormData = {
        project_name: "",
        leader_name: "",
        required_skills: "",
        end_date: "",
        description: "",
        status: "Open",
        poc1: "",
        poc2: null,
        poc3: null
    }

    // Form State
    const [formData, setFormData] = useState(initialFormData)

    // Data State
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Modal & Edit State
    const [showActionModal, setShowActionModal] = useState(false)
    const [selectedProject, setSelectedProject] = useState(null)
    const [editingId, setEditingId] = useState(null)

    useEffect(() => {
        const storedUser = sessionStorage.getItem("user")
        if (!storedUser) {
            navigate("/")
            return
        }
        const parsedUser = JSON.parse(storedUser)
        if ((parsedUser.role_type || "").toLowerCase() !== "manager") {
            navigate("/home")
            return
        }
        setUser(parsedUser)
        fetchProjects()
    }, [navigate])

    const fetchProjects = async () => {
        try {
            const res = await fetch(`${API_URL}/api/projects`)
            if (res.ok) {
                const data = await res.json()
                setProjects(data)
            }
        } catch (err) {
            console.error("Failed to fetch projects", err)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handlePocChange = (index, value) => {
        setFormData({ ...formData, [`poc${index + 1}`]: value })
    }

    const addPoc = () => {
        if (formData.poc2 === null) setFormData({ ...formData, poc2: "" })
        else if (formData.poc3 === null) setFormData({ ...formData, poc3: "" })
    }

    const removePoc = (index) => {
        const newState = { ...formData };
        if (index === 0) {
            newState.poc1 = newState.poc2 !== null ? newState.poc2 : "";
            newState.poc2 = newState.poc3;
            newState.poc3 = null;
        } else if (index === 1) {
            newState.poc2 = newState.poc3;
            newState.poc3 = null;
        } else if (index === 2) {
            newState.poc3 = null;
        }
        setFormData(newState);
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.project_name || !formData.project_name.trim()) {
            toast.warn("Project Name is required")
            return
        }
        setSubmitting(true)
        try {
            // For Update: user_empid is required for ownership check. 
            // For Create: empid is used as owner.
            const payload = { ...formData, user_empid: user.empid, empid: user.empid }

            let url = `${API_URL}/api/projects`
            let method = "POST"

            if (editingId) {
                url = `${API_URL}/api/projects/${editingId}`
                method = "PATCH"
            }

            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                toast.success(editingId ? "Project updated successfully!" : "Project created successfully!")
                setFormData(initialFormData)
                setEditingId(null)
                fetchProjects()
            } else {
                const errData = await res.json().catch(() => ({}))
                toast.error(errData.error || (editingId ? "Failed to update project" : "Failed to create project"))
            }
        } catch (err) {
            console.error("Error submitting project", err)
            toast.error("Error submitting project")
        } finally {
            setSubmitting(false)
        }
    }

    const handleStatusChange = async (id, newStatus) => {
        try {
            const res = await fetch(`${API_URL}/api/projects/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) {
                fetchProjects()
            } else {
                toast.error("Failed to update status")
            }
        } catch (err) {
            console.error("Error updating status", err)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this project?")) return
        try {
            const res = await fetch(`${API_URL}/api/projects/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_empid: user.empid })
            })
            if (res.ok) {
                fetchProjects()
            } else {
                toast.error("Failed to delete project")
            }
        } catch (err) {
            console.error("Error deleting project", err)
        }
    }



    const handleRowClick = (project) => {
        setSelectedProject(project)
        setShowActionModal(true)
    }

    const handleActionEdit = () => {
        if (!selectedProject) return
        if (String(selectedProject.empid) !== String(user?.empid)) {
            toast.error("You can only edit your own activities")
            setShowActionModal(false)
            return
        }
        setFormData({
            project_name: selectedProject.project_name,
            leader_name: selectedProject.leader_name,
            required_skills: Array.isArray(selectedProject.required_skills) ? selectedProject.required_skills.join(", ") : (selectedProject.required_skills || ""),
            end_date: selectedProject.end_date,
            description: selectedProject.description,
            status: selectedProject.status,
            poc1: selectedProject.poc1 || "",
            poc2: selectedProject.poc2 || null,
            poc3: selectedProject.poc3 || null
        })
        setEditingId(selectedProject.id)
        setShowActionModal(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleActionDelete = () => {
        if (!selectedProject) return
        if (String(selectedProject.empid) !== String(user?.empid)) {
            toast.error("You can only delete your own activities")
            setShowActionModal(false)
            return
        }
        handleDelete(selectedProject.id)
        setShowActionModal(false)
    }

    const handleCancelEdit = () => {
        setFormData(initialFormData)
        setEditingId(null)
    }

    return (
        <div className="min-vh-100 bg-light">
            <Navbar user={user} onLogout={onLogout} title="Activities Manager" />

            <Container fluid className="px-4 py-4">
                <Row className="g-4">
                    {/* Create Project Form */}
                    <Col lg={4} md={12}> {/* Reduced col width slightly for better proportion */}
                        <Card className="shadow-sm border-0 h-100" style={{ borderRadius: "4px" }}>
                            <Card.Header className="bg-white border-bottom-0 pt-4 pb-0">
                                <h4 className="fw-bold text-primary mb-0">{editingId ? "Update Activity" : "Create New Activity"}</h4>
                            </Card.Header>
                            <Card.Body>
                                <Form onSubmit={handleSubmit}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">Project Name</Form.Label>
                                        <CreatableSelect
                                            value={formData.project_name}
                                            onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                                            options={Array.from(new Set(projects.map(p => p.project_name).filter(Boolean))).sort()}
                                            placeholder="Select or type project name"
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">Leader</Form.Label>
                                        <Form.Control
                                            name="leader_name"
                                            value={formData.leader_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">Required Skills</Form.Label>
                                        <Form.Control
                                            name="required_skills"
                                            value={formData.required_skills}
                                            onChange={handleChange}
                                            placeholder="e.g. React, Node.js"
                                        />
                                    </Form.Group>

                                    <Row>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-semibold">End Date</Form.Label>
                                                <Form.Control
                                                    type="date"
                                                    name="end_date"
                                                    value={formData.end_date}
                                                    onChange={handleChange}
                                                    required
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="fw-semibold">Status</Form.Label>
                                                <Form.Select
                                                    name="status"
                                                    value={formData.status}
                                                    onChange={handleChange}
                                                >
                                                    <option value="Open">Open</option>
                                                    <option value="Ongoing">Ongoing</option>
                                                    <option value="Closed">Closed</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-semibold">Point of Contact</Form.Label>
                                        {[formData.poc1, formData.poc2, formData.poc3].map((poc, index) => {
                                            if (poc === null) return null;
                                            return (
                                                <div key={index} className="d-flex gap-2 mb-2">
                                                    <Form.Control
                                                        value={poc}
                                                        onChange={(e) => handlePocChange(index, e.target.value)}
                                                        placeholder={`POC Name ${index + 1}`}
                                                    />
                                                    {((index === 0 && formData.poc2 === null) || (index === 1 && formData.poc3 === null)) && (
                                                        <Button variant="outline-primary" onClick={addPoc} title="Add POC">+</Button>
                                                    )}
                                                    {(index > 0 || formData.poc2 !== null) && (
                                                        <Button variant="outline-danger" onClick={() => removePoc(index)} title="Remove POC">-</Button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label className="fw-semibold">Description</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            required
                                        />
                                    </Form.Group>

                                    <div className="d-grid gap-2">
                                        <Button type="submit" variant="primary" className="fw-bold" disabled={submitting}>
                                            {submitting ? <Spinner animation="border" size="sm" /> : (editingId ? "Update Project" : "Create Project")}
                                        </Button>
                                        {editingId && (
                                            <Button variant="outline-secondary" className="fw-bold" onClick={handleCancelEdit} disabled={submitting}>
                                                Cancel
                                            </Button>
                                        )}
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Existing Projects List */}
                    <Col lg={8} md={12}>
                        <Card className="shadow-sm border-0 h-100" style={{ borderRadius: "4px" }}>
                            <Card.Header className="bg-white border-bottom-0 pt-4 pb-0">
                                <h4 className="fw-bold text-dark mb-0">Existing Activities</h4>
                            </Card.Header>
                            <Card.Body>
                                {loading ? (
                                    <div style={{ minHeight: "400px", display: "flex", justifyContent: "center", alignItems: "center" }}><Loader /></div>
                                ) : projects.length === 0 ? (
                                    <div className="text-muted text-center py-5">No projects found.</div>
                                ) : (
                                    <div className="table-responsive">
                                        <Table hover className="align-middle">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th className="border-0">Project</th>
                                                    <th className="border-0">Leader</th>
                                                    <th className="border-0">Status</th>
                                                    <th className="border-0 text-end">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {projects.map((p) => (
                                                    <tr key={p.id} onClick={() => handleRowClick(p)} style={{ cursor: "pointer" }}>
                                                        <td className="fw-bold text-primary">{p.project_name}</td>
                                                        <td className="text-muted small">{p.leader_name}</td>
                                                        <td onClick={(e) => e.stopPropagation()}>
                                                            <Form.Select
                                                                size="sm"
                                                                value={p.status}
                                                                onChange={(e) => handleStatusChange(p.id, e.target.value)}
                                                                disabled={String(p.empid) !== String(user?.empid)}
                                                                style={{
                                                                    fontSize: "12px",
                                                                    width: "50%",
                                                                    minWidth: "100px",
                                                                    fontWeight: "500",
                                                                    color: p.status === "Open" ? "#198754" : p.status === "Closed" ? "#6c757d" : "#ffc107",
                                                                    borderColor: "#e9ecef"
                                                                }}
                                                            >
                                                                <option value="Open" style={{ color: "#000" }}>Open</option>
                                                                <option value="Ongoing" style={{ color: "#000" }}>Ongoing</option>
                                                                <option value="Closed" style={{ color: "#000" }}>Closed</option>
                                                            </Form.Select>
                                                        </td>
                                                        <td onClick={(e) => e.stopPropagation()}>
                                                            <div className="d-flex align-items-center justify-content-end gap-2">
                                                                {String(p.empid) === String(user?.empid) && (
                                                                    <Button
                                                                        variant="outline-danger"
                                                                        size="sm"
                                                                        className="border-0"
                                                                        onClick={() => handleDelete(p.id)}
                                                                        title="Delete"
                                                                    >
                                                                        🗑️
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            {/* Action Modal */}
            <Modal show={showActionModal} onHide={() => setShowActionModal(false)} centered contentClassName="border-0 shadow-lg">
                <Modal.Header closeButton className="border-bottom-0 pb-0">
                    <Modal.Title className="fw-bold text-dark">Manage Activity</Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-2 pb-4 px-4">
                    <div className="text-center mb-4">
                        <h5 className="fw-bold text-primary mb-1">{selectedProject?.project_name}</h5>
                        <small className="text-muted">Select an action below</small>
                    </div>

                    {selectedProject && String(selectedProject.empid) !== String(user?.empid) && (
                        <div className="alert alert-warning border-0 small mb-3 text-center" style={{ backgroundColor: "#fff3cd", color: "#856404" }}>
                            🔒 You can only edit activities you created.
                        </div>
                    )}

                    <div className="d-grid gap-3">
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleActionEdit}
                            disabled={!selectedProject || String(selectedProject.empid) !== String(user?.empid)}
                            className="shadow-sm border-0 d-flex align-items-center justify-content-center gap-2"
                            style={{ borderRadius: "12px", fontWeight: "600", fontSize: "16px", padding: "12px" }}
                        >
                            <span>📝</span> Edit Activity
                        </Button>
                        <Button
                            variant="danger"
                            size="lg"
                            onClick={handleActionDelete}
                            disabled={!selectedProject || String(selectedProject.empid) !== String(user?.empid)}
                            className="shadow-sm border-0 d-flex align-items-center justify-content-center gap-2"
                            style={{ borderRadius: "12px", fontWeight: "600", fontSize: "16px", padding: "12px" }}
                        >
                            <span>🗑️</span> Delete Activity
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>
        </div >
    )
}
