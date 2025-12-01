import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { API_URL } from "../config"
import PageLayout from "../components/PageLayout"
import { theme } from "../utils/theme"

export default function InlineActivitiesScreen({ onLogout }) {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)

    // Data State
    const [projects, setProjects] = useState([])
    const [filteredProjects, setFilteredProjects] = useState([])
    const [loading, setLoading] = useState(true)

    // Filter State
    const [statusFilter, setStatusFilter] = useState("All")
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
        if (statusFilter === "All") {
            setFilteredProjects(projects)
        } else {
            setFilteredProjects(projects.filter(p => p.status === statusFilter))
        }
    }, [statusFilter, projects])

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
            status: project.status
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
            const res = await fetch(`${API_URL}/api/projects/${editingProjectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            if (!res.ok) throw new Error("Failed to update project")

            const updatedProject = await res.json()

            // Update local state
            const updatedProjects = projects.map(p => p.id === editingProjectId ? updatedProject : p)
            setProjects(updatedProjects)
            setFilteredProjects(updatedProjects) // Re-apply filter might be needed, but this is simple sync

            setEditingProjectId(null)
            alert("Project updated successfully!")
        } catch (err) {
            console.error("Update failed", err)
            alert("Failed to update project: " + err.message)
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

    const styles = {
        controls: {
            marginBottom: "24px",
            display: "flex",
            gap: "12px",
            alignItems: "center",
            background: theme.colors.surface,
            padding: "16px",
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.shadows.card,
            border: `1px solid ${theme.colors.border}`,
        },
        label: {
            fontWeight: "600",
            color: theme.colors.text.primary,
        },
        select: {
            padding: "8px 12px",
            borderRadius: theme.borderRadius.sm,
            border: `1px solid ${theme.colors.border}`,
            fontSize: "14px",
            outline: "none",
            cursor: "pointer",
        },
        grid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "24px",
        },
        card: (status) => {
            let borderColor = theme.colors.border
            let borderTopColor = theme.colors.border

            if (status === "Open") {
                borderTopColor = theme.colors.success // Green
            } else if (status === "Ongoing") {
                borderTopColor = theme.colors.warning // Yellow
            } else if (status === "Closed") {
                borderTopColor = "#9ca3af" // Grey
            }

            return {
                background: theme.colors.surface,
                borderRadius: theme.borderRadius.lg,
                boxShadow: theme.shadows.card,
                border: `1px solid ${borderColor}`,
                borderTop: `4px solid ${borderTopColor}`,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                transition: "transform 0.2s ease",
                cursor: "pointer",
            }
        },
        cardTitle: {
            fontSize: "18px",
            fontWeight: "700",
            color: theme.colors.text.primary,
            margin: 0,
        },
        cardSubtitle: {
            fontSize: "13px",
            color: theme.colors.text.secondary,
            marginBottom: "8px",
        },
        tag: {
            display: "inline-block",
            padding: "4px 8px",
            background: theme.colors.background,
            borderRadius: "4px",
            fontSize: "12px",
            color: theme.colors.text.secondary,
            marginRight: "6px",
            marginBottom: "6px",
        },
        description: {
            fontSize: "14px",
            color: theme.colors.text.primary,
            lineHeight: "1.5",
        },
        footer: {
            marginTop: "auto",
            paddingTop: "12px",
            borderTop: `1px solid ${theme.colors.border}`,
            fontSize: "12px",
            color: theme.colors.text.secondary,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
        },
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
            fontSize: "12px",
            fontWeight: "600",
            color: theme.colors.text.secondary,
            textTransform: "uppercase"
        },
        editInput: {
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: "13px",
            width: "100%",
            boxSizing: "border-box"
        },
        editBtn: {
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: "linear-gradient(90deg, #0078d4, #005fa3)",
            color: "white",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0, 120, 212, 0.2)",
        },
        cancelBtn: {
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            color: "#475569",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
        }
    }

    return (
        <PageLayout user={user} title="Inline Activities" onLogout={onLogout}>
            <div style={styles.controls}>
                <span style={styles.label}>Filter by Status:</span>
                <select style={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="All">All Projects</option>
                    <option value="Open">Open</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Closed">Closed</option>
                </select>
            </div>

            {loading ? (
                <div>Loading activities...</div>
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
                        >
                            {editingProjectId === p.id ? (
                                // --- EDIT MODE ---
                                <div style={styles.editContainer} onClick={e => e.stopPropagation()}>
                                    <div style={styles.editField}>
                                        <label style={styles.editLabel}>Project Name</label>
                                        <input
                                            style={styles.editInput}
                                            value={formData.project_name}
                                            onChange={e => setFormData({ ...formData, project_name: e.target.value })}
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
                                    <div>
                                        <h3 style={styles.cardTitle}>{p.project_name}</h3>
                                        <div style={styles.cardSubtitle}>Led by {p.leader_name}</div>
                                    </div>

                                    {expandedProjectId === p.id && (
                                        <div style={styles.description}>{p.description}</div>
                                    )}

                                    <div>
                                        {(Array.isArray(p.required_skills) ? p.required_skills : JSON.parse(p.required_skills || "[]")).map((s, idx) => (
                                            s.trim() && <span key={idx} style={styles.tag}>{s.trim()}</span>
                                        ))}
                                    </div>

                                    <div style={styles.footer}>
                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                            <span>Ends: {p.end_date}</span>
                                            <span style={{ fontWeight: "600" }}>{p.status}</span>
                                        </div>

                                        {isManager && expandedProjectId === p.id && (
                                            <button
                                                style={styles.editBtn}
                                                onClick={(e) => handleEditClick(e, p)}
                                            >
                                                Edit Details
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </PageLayout>
    )
}
