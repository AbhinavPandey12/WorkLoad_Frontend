import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { API_URL } from "../config"
import PageLayout from "../components/PageLayout"
import { theme } from "../utils/theme"
import Loader from "../components/Loader"
import CreatableSelect from "../components/CreatableSelect"
import { Row, Col, Form, Card } from "react-bootstrap";

// Simple SVG Icons
const Icons = {
    User: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px", verticalAlign: "middle" }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    ),
    Briefcase: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px", verticalAlign: "middle" }}>
            <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
    ),
    Calendar: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px", verticalAlign: "middle" }}>
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
    ),
    Document: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px", verticalAlign: "middle" }}>
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            <path d="M10 9H8" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
        </svg>
    ),
    Folder: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px", verticalAlign: "middle" }}>
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        </svg>
    ),
    Creator: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px", verticalAlign: "middle" }}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <polyline points="16 11 18 13 22 9" />
        </svg>
    )
}

export default function InlineActivitiesScreen({ onLogout }) {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)

    // Data State
    const [projects, setProjects] = useState([])
    const [filteredProjects, setFilteredProjects] = useState([])
    const [loading, setLoading] = useState(true)

    // Filter State
    const [statusFilter, setStatusFilter] = useState("All")
    const [searchQuery, setSearchQuery] = useState("")
    const [expandedProjectId, setExpandedProjectId] = useState(null)

    // Edit State
    const [editingProjectId, setEditingProjectId] = useState(null)
    const [formData, setFormData] = useState({})
    const [saving, setSaving] = useState(false)

    // Check if manager
    const isManager = user && (user.role_type || "").toLowerCase() === "manager"

    useEffect(() => {
        const storedUser = sessionStorage.getItem("user")
        if (!storedUser) {
            navigate("/")
            return
        }
        setUser(JSON.parse(storedUser))
        fetchProjects()
    }, [navigate])

    const fetchProjects = async () => {
        try {
            const res = await fetch(`${API_URL}/api/projects`)
            if (res.ok) {
                const data = await res.json()
                setProjects(data)
                setFilteredProjects(data)
            }
        } catch (err) {
            console.error("Failed to fetch projects", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let result = projects

        // Filter by Status
        if (statusFilter !== "All") {
            result = result.filter(p => p.status === statusFilter)
        }

        // Filter by Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(p =>
                (p.project_name || "").toLowerCase().includes(query)
            )
        }

        setFilteredProjects(result)
    }, [statusFilter, searchQuery, projects])

    const handleEditClick = (e, project) => {
        e.stopPropagation()
        setEditingProjectId(project.id)
        setExpandedProjectId(project.id) // Ensure it's expanded
        setFormData({
            project_name: project.project_name,
            leader_name: project.leader_name,
            description: project.description,
            required_skills: Array.isArray(project.required_skills) ? project.required_skills : JSON.parse(project.required_skills || "[]"),
            end_date: project.end_date,
            status: project.status,
            poc1: project.poc1 || "",
            poc2: project.poc2 || null,
            poc3: project.poc3 || null
        })
    }

    const handleCancel = (e) => {
        e.stopPropagation()
        setEditingProjectId(null)
        setFormData({})
    }

    const handleSave = async (e) => {
        e.stopPropagation()
        setSaving(true)
        try {
            const payload = { ...formData, user_empid: user.empid }

            const res = await fetch(`${API_URL}/api/projects/${editingProjectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error("Failed to update project")

            const updatedProject = await res.json()

            // Update local state
            const updatedProjects = projects.map(p => p.id === editingProjectId ? updatedProject : p)
            setProjects(updatedProjects)
            setFilteredProjects(updatedProjects) // Re-apply filter might be needed, but this is simple sync

            setEditingProjectId(null)
            toast.success("Project updated successfully!")
        } catch (err) {
            console.error("Update failed", err)
            toast.error("Failed to update project: " + err.message)
        } finally {
            setSaving(false)
        }
    }

    const addSkill = (skill) => {
        if (!skill) return
        setFormData(prev => ({
            ...prev,
            required_skills: [...(prev.required_skills || []), skill]
        }))
    }

    const removeSkill = (skill) => {
        setFormData(prev => ({
            ...prev,
            required_skills: (prev.required_skills || []).filter(s => s !== skill)
        }))
    }

    const handlePocChange = (index, value) => {
        setFormData(prev => ({ ...prev, [`poc${index + 1}`]: value }))
    }

    const addPoc = () => {
        if (formData.poc2 === null) setFormData(prev => ({ ...prev, poc2: "" }))
        else if (formData.poc3 === null) setFormData(prev => ({ ...prev, poc3: "" }))
    }

    const removePoc = (index) => {
        setFormData(prev => {
            if (index === 0) {
                return {
                    ...prev,
                    poc1: prev.poc2 !== null ? prev.poc2 : "",
                    poc2: prev.poc3,
                    poc3: null
                }
            }
            if (index === 1) return { ...prev, poc2: prev.poc3, poc3: null }
            if (index === 2) return { ...prev, poc3: null }
            return prev
        })
    }

    const styles = {
        controls: {
            marginBottom: "24px",
            display: "flex",
            gap: "16px",
            alignItems: "center",
            background: theme.colors.surface,
            padding: "16px",
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.shadows.card,
            border: `1px solid ${theme.colors.border}`,
            maxWidth: "fit-content",
            flexWrap: "wrap", // Allow wrapping on very small screens
        },
        label: {
            fontWeight: "600",
            color: theme.colors.text.primary,
            whiteSpace: "nowrap",
        },
        select: {
            padding: "8px 12px",
            borderRadius: theme.borderRadius.sm,
            border: `1px solid ${theme.colors.border}`,
            fontSize: "14px",
            outline: "none",
            cursor: "pointer",
            minWidth: "140px",
        },
        searchInput: {
            padding: "8px 12px",
            borderRadius: theme.borderRadius.sm,
            border: `1px solid ${theme.colors.border}`,
            fontSize: "14px",
            outline: "none",
            minWidth: "200px",
        },
        grid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", // Restored size
            gap: "24px", // Restored gap
        },
        card: (status) => {
            let borderTopColor = theme.colors.border

            if (status === "Open") {
                borderTopColor = "#22c55e" // Green top border
            } else if (status === "Ongoing") {
                borderTopColor = "#eab308" // Yellow top border
            } else if (status === "Closed") {
                borderTopColor = "#6b7280" // Grey top border
            }

            return {
                background: "#fdfdff", // Faint purple/white
                backgroundColor: "#f8faff", // Faint purple
                borderRadius: "8px",
                boxShadow: theme.shadows.card,
                border: `1px solid ${theme.colors.border}`,
                borderTop: `4px solid ${borderTopColor}`, // Added color line on top
                padding: "20px", // Reduced padding slightly to help with spacing feel
                display: "flex",
                flexDirection: "column",
                gap: "8px", // Reduced gap
                transition: "all 0.25s ease",
                cursor: "pointer",
                position: "relative",
                minHeight: "160px",
            }
        },
        cardHover: {
            transform: "translateY(-6px)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.09)",
        },
        cardTitle: {
            fontSize: "14px",
            fontWeight: "500", // Not bold (was 700)
            color: theme.colors.text.primary,
            margin: 0,
            paddingRight: "60px",
            marginBottom: "8px" // Consistent spacing
        },
        cardSubtitle: {
            fontSize: "14px",
            color: theme.colors.text.secondary,
            fontWeight: "500",
            marginBottom: "8px" // Consistent spacing
        },
        skillsText: {
            fontSize: "14px",
            color: theme.colors.text.secondary,
            fontWeight: "500",
            marginBottom: "8px" // Consistent spacing
        },
        description: {
            fontSize: "14px", // Restored size
            color: theme.colors.text.primary, // Darker for better visibility
            lineHeight: "1.6",
            marginTop: "12px",
            marginBottom: "12px", // Add space before footer
            paddingTop: "12px",
            borderTop: `1px solid ${theme.colors.border}`,
        },
        footer: {
            marginTop: "auto",
            paddingTop: "12px",
            borderTop: `1px solid ${theme.colors.border}`, // Re-added border for potential separation, or keep clean? User said "End date should come after description".
            fontSize: "13px", // Restored size
            color: theme.colors.text.secondary,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
        },
        statusBadge: (status) => {
            let bg = "#f3f4f6"
            let color = "#374151"
            if (status === "Open") { bg = "#22c55e"; color = "white" } // Green
            else if (status === "Ongoing") { bg = "#eab308"; color = "white" } // Yellow
            else if (status === "Closed") { bg = "#6b7280"; color = "white" } // Grey

            return {
                position: "absolute",
                top: "16px", // Adjusted for padding
                right: "16px", // Adjusted for padding
                background: bg,
                color: color,
                padding: "4px 10px", // Slightly larger
                borderRadius: "12px", // Rounded corner
                fontSize: "12px", // Slightly larger
                fontWeight: "600",
                textTransform: "uppercase",
            }
        },
        // ... (rest of edit styles omitted for brevity if unchanged, but need to be careful with replace)
        // Edit Styles
        editContainer: {
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            cursor: "default"
        },
        editField: {
            display: "flex",
            flexDirection: "column",
            gap: "4px"
        },
        editLabel: {
            fontSize: "11px",
            fontWeight: "600",
            color: theme.colors.text.secondary,
            textTransform: "uppercase"
        },
        editInput: {
            padding: "6px 8px",
            borderRadius: "4px",
            border: "1px solid #d1d5db",
            fontSize: "12px",
            width: "100%",
            boxSizing: "border-box"
        },
        editBtn: {
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            background: "#6ea8fe", // Blue 300
            color: "#052c65", // Dark Blue text
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "none",
        },
        cancelBtn: {
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            color: "#475569",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
        }
    }

    // Helper to format skills
    const formatSkills = (skillsJson) => {
        const skills = Array.isArray(skillsJson) ? skillsJson : JSON.parse(skillsJson || "[]")
        return skills.join(", ")
    }

    return (
        <PageLayout user={user} title="Inline Activities" onLogout={onLogout} fluid>
            {/* Search and Filter Bar - Matching Employee Directory Style */}
            <Card className="mb-4 shadow-sm border-0" style={{ borderRadius: "8px" }}>
                <Card.Body className="p-3">
                    <Row className="g-3 align-items-center">
                        <Col xs={12} md={6}>
                            <Form.Control
                                type="text"
                                placeholder="Search by Project Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </Col>
                        <Col xs={12} md={6}>
                            <Form.Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="All">All Projects</option>
                                <option value="Open">Open</option>
                                <option value="Ongoing">Ongoing</option>
                                <option value="Closed">Closed</option>
                            </Form.Select>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {loading ? (
                <div style={{ height: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <Loader />
                </div>
            ) : filteredProjects.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: theme.colors.text.secondary }}>
                    No activities found matching your criteria.
                </div>
            ) : (
                <div style={styles.grid}>
                    {filteredProjects.map((p, i) => (
                        <div
                            key={i}
                            style={styles.card(p.status)}
                            onClick={() => !editingProjectId && setExpandedProjectId(expandedProjectId === p.id ? null : p.id)}
                            onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)"
                                e.currentTarget.style.boxShadow = theme.shadows.card
                            }}
                        >
                            {editingProjectId === p.id ? (
                                // --- EDIT MODE ---
                                <div style={styles.editContainer} onClick={e => e.stopPropagation()}>
                                    <div style={styles.editField}>
                                        <label style={styles.editLabel}>Project Name</label>
                                        <CreatableSelect
                                            value={formData.project_name}
                                            onChange={e => setFormData({ ...formData, project_name: e.target.value })}
                                            options={Array.from(new Set(projects.map(p => p.project_name).filter(Boolean))).sort()}
                                        />
                                    </div>
                                    <div style={styles.editField}>
                                        <label style={styles.editLabel}>Leader Name</label>
                                        <input
                                            style={styles.editInput}
                                            value={formData.leader_name}
                                            onChange={e => setFormData({ ...formData, leader_name: e.target.value })}
                                        />
                                    </div>
                                    <div style={styles.editField}>
                                        <label style={styles.editLabel}>Description</label>
                                        <textarea
                                            style={{ ...styles.editInput, minHeight: "60px", resize: "vertical" }}
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>
                                    <div style={styles.editField}>
                                        <label style={styles.editLabel}>Status</label>
                                        <select
                                            style={styles.editInput}
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="Open">Open</option>
                                            <option value="Ongoing">Ongoing</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                    <div style={styles.editField}>
                                        <label style={styles.editLabel}>End Date</label>
                                        <input
                                            type="date"
                                            style={styles.editInput}
                                            value={formData.end_date}
                                            onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        />
                                    </div>
                                    <div style={styles.editField}>
                                        <label style={styles.editLabel}>Required Skills</label>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                                            {formData.required_skills.map(s => (
                                                <span key={s} style={{ ...styles.tag, background: "#e0f2fe", color: "#0284c7" }}>
                                                    {s} <span style={{ cursor: "pointer", fontWeight: "bold", marginLeft: "4px" }} onClick={() => removeSkill(s)}>×</span>
                                                </span>
                                            ))}
                                        </div>
                                        <input
                                            style={styles.editInput}
                                            placeholder="Type skill and press Enter"
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    addSkill(e.target.value.trim())
                                                    e.target.value = ''
                                                }
                                            }}
                                        />
                                    </div>

                                    <div style={styles.editField}>
                                        <label style={styles.editLabel}>Point of Contact (Max 3)</label>
                                        {[formData.poc1, formData.poc2, formData.poc3].map((poc, index) => {
                                            if (poc === null) return null;
                                            return (
                                                <div key={index} style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                                                    <input
                                                        style={styles.editInput}
                                                        value={poc}
                                                        onChange={(e) => handlePocChange(index, e.target.value)}
                                                        placeholder={`POC Name ${index + 1}`}
                                                    />
                                                    {((index === 0 && formData.poc2 === null) || (index === 1 && formData.poc3 === null)) && (
                                                        <button style={{ ...styles.editBtn, padding: "4px 10px" }} onClick={addPoc} title="Add POC">+</button>
                                                    )}
                                                    {(index > 0 || formData.poc2 !== null) && (
                                                        <button style={{ ...styles.cancelBtn, padding: "4px 10px", color: "#ef4444", borderColor: "#fca5a5" }} onClick={() => removePoc(index)} title="Remove POC">-</button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                                        <button style={styles.cancelBtn} onClick={handleCancel} disabled={saving}>Cancel</button>
                                        <button style={styles.editBtn} onClick={handleSave} disabled={saving}>
                                            {saving ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // --- VIEW MODE ---
                                <>
                                    {/* Header Section Flattened */}
                                    <div style={{ marginBottom: "0px" }}> {/* Removed extra margins since individual items have them */}
                                        <div style={styles.statusBadge(p.status)}>
                                            {p.status}
                                        </div>

                                        {/* Project Name */}
                                        <div style={styles.cardTitle}>
                                            <span style={{ display: "flex", alignItems: "center" }}>
                                                <Icons.Folder />
                                                <span style={{ marginRight: "6px" }}>Project:</span>
                                                {p.project_name}
                                            </span>
                                        </div>

                                        {/* Leader Name */}
                                        <div style={styles.cardSubtitle}>
                                            <span style={{ display: "flex", alignItems: "center" }}>
                                                <Icons.User />
                                                <span style={{ marginRight: "4px" }}>Leader:</span> {p.leader_name}
                                            </span>
                                        </div>

                                        {/* Skills */}
                                        <div style={styles.skillsText}>
                                            <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2px" }}>
                                                <span style={{ display: "inline-flex", alignItems: "center" }}>
                                                    <Icons.Briefcase />
                                                    <span style={{ marginRight: "4px" }}>Skills Required:</span>
                                                </span>
                                                {formatSkills(p.required_skills)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description in Middle/Bottom (Before Footer) */}
                                    {expandedProjectId === p.id && (
                                        <>
                                            <div style={styles.description}>
                                                <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                                                    <Icons.Document />
                                                    <strong>Description:</strong>
                                                </div>
                                                <div style={{ color: theme.colors.text.secondary }}>{p.description}</div>
                                            </div>

                                            {/* POC Section */}
                                            {(p.poc1 || p.poc2 || p.poc3) && (
                                                <div style={{ marginBottom: "12px", fontSize: "14px", color: theme.colors.text.secondary }}>
                                                    <div style={{ display: "flex", alignItems: "center", marginBottom: "4px", color: theme.colors.text.primary }}>
                                                        <Icons.User />
                                                        <strong>Point of Contact:</strong>
                                                    </div>
                                                    <ul style={{ margin: "0", paddingLeft: "20px", listStyleType: "disc" }}>
                                                        {[p.poc1, p.poc2, p.poc3].filter(Boolean).map((poc, idx) => (
                                                            <li key={idx} style={{ marginBottom: "2px" }}>{poc}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Footer (End Date & Created By) */}
                                    <div style={styles.footer}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                                            <span style={{ display: "flex", alignItems: "center" }}>
                                                <Icons.Calendar />
                                                Registration Ends: {p.end_date ? p.end_date.split("-").reverse().join("-") : ""}
                                            </span>
                                            {p.creator_name && (
                                                <span style={{ display: "flex", alignItems: "center", color: "#6b7280" }}>
                                                    <Icons.Creator />
                                                    Created by: {p.creator_name}
                                                </span>
                                            )}
                                        </div>
                                        {isManager && expandedProjectId === p.id && String(p.empid) === String(user.empid) && (
                                            <button
                                                style={{ ...styles.editBtn, padding: "6px 12px", fontSize: "12px" }}
                                                onClick={(e) => handleEditClick(e, p)}
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div >
            )}
        </PageLayout >
    )
}
