import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { API_URL } from "../config"
import PageLayout from "../components/PageLayout"
import { theme } from "../utils/theme"
import { useIsMobile } from "../hooks/useIsMobile"

export default function ActivitiesScreen({ onLogout }) {
    const navigate = useNavigate()
    const isMobile = useIsMobile()
    const [user, setUser] = useState(null)

    // Form State
    const [formData, setFormData] = useState({
        project_name: "",
        leader_name: "",
        required_skills: "",
        end_date: "",
        description: "",
        status: "Open"
    })

    // Data State
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

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

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const res = await fetch(`${API_URL}/api/projects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, empid: user.id })
            })

            if (res.ok) {
                alert("Project created successfully!")
                setFormData({
                    project_name: "",
                    leader_name: "",
                    required_skills: "",
                    end_date: "",
                    description: "",
                    status: "Open"
                })
                fetchProjects()
            } else {
                alert("Failed to create project")
            }
        } catch (err) {
            console.error("Error creating project", err)
            alert("Error creating project")
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
                alert("Failed to update status")
            }
        } catch (err) {
            console.error("Error updating status", err)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this project?")) return
        try {
            const res = await fetch(`${API_URL}/api/projects/${id}`, {
                method: "DELETE"
            })
            if (res.ok) {
                fetchProjects()
            } else {
                alert("Failed to delete project")
            }
        } catch (err) {
            console.error("Error deleting project", err)
        }
    }

    const styles = {
        container: {
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1.5fr",
            gap: "24px",
            alignItems: "start",
        },
        formCard: {
            background: theme.colors.surface,
            padding: "24px",
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.shadows.card,
            border: `1px solid ${theme.colors.border}`,
        },
        listCard: {
            background: theme.colors.surface,
            padding: "24px",
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.shadows.card,
            border: `1px solid ${theme.colors.border}`,
        },
        title: {
            fontSize: "20px",
            fontWeight: "700",
            color: theme.colors.primary,
            marginBottom: "20px",
            borderBottom: `2px solid ${theme.colors.border}`,
            paddingBottom: "10px",
        },
        field: {
            marginBottom: "16px",
        },
        label: {
            display: "block",
            marginBottom: "8px",
            fontWeight: "600",
            color: theme.colors.text.primary,
            fontSize: "14px",
        },
        input: {
            width: "100%",
            padding: "10px",
            borderRadius: theme.borderRadius.sm,
            border: `1px solid ${theme.colors.border}`,
            fontSize: "14px",
            boxSizing: "border-box",
            outline: "none",
        },
        textarea: {
            width: "100%",
            padding: "10px",
            borderRadius: theme.borderRadius.sm,
            border: `1px solid ${theme.colors.border}`,
            fontSize: "14px",
            boxSizing: "border-box",
            outline: "none",
            minHeight: "80px",
            resize: "vertical",
        },
        select: {
            width: "100%",
            padding: "10px",
            borderRadius: theme.borderRadius.sm,
            border: `1px solid ${theme.colors.border}`,
            fontSize: "14px",
            boxSizing: "border-box",
            outline: "none",
            background: "#fff",
        },
        button: {
            width: "100%",
            padding: "12px",
            background: theme.colors.primaryGradient,
            color: "#fff",
            border: "none",
            borderRadius: theme.borderRadius.sm,
            fontWeight: "700",
            cursor: "pointer",
            marginTop: "10px",
        },
        projectItem: {
            padding: "16px",
            borderBottom: `1px solid ${theme.colors.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        },
        statusBadge: (status) => {
            let bg = theme.colors.text.secondary
            if (status === "Open") bg = theme.colors.success
            if (status === "Ongoing") bg = theme.colors.warning
            if (status === "Closed") bg = "#9ca3af"

            return {
                padding: "4px 10px",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "12px",
                fontWeight: "600",
                background: bg,
            }
        }
    }

    return (
        <PageLayout user={user} title="Activities Management" onLogout={onLogout}>
            <div style={styles.container}>
                {/* Create Form */}
                <div style={styles.formCard}>
                    <h2 style={styles.title}>Create New Activity</h2>
                    <form onSubmit={handleSubmit}>
                        <div style={styles.field}>
                            <label style={styles.label}>Project Name</label>
                            <input style={styles.input} name="project_name" value={formData.project_name} onChange={handleChange} required />
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Leader</label>
                            <input style={styles.input} name="leader_name" value={formData.leader_name} onChange={handleChange} required />
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Required Skills (comma separated)</label>
                            <input style={styles.input} name="required_skills" value={formData.required_skills} onChange={handleChange} placeholder="React, Node.js, Python" />
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>End Date</label>
                            <input style={styles.input} type="date" name="end_date" value={formData.end_date} onChange={handleChange} required />
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Status</label>
                            <select style={styles.select} name="status" value={formData.status} onChange={handleChange}>
                                <option value="Open">Open</option>
                                <option value="Ongoing">Ongoing</option>
                                <option value="Closed">Closed</option>
                            </select>
                        </div>
                        <div style={styles.field}>
                            <label style={styles.label}>Description</label>
                            <textarea style={styles.textarea} name="description" value={formData.description} onChange={handleChange} required />
                        </div>
                        <button style={styles.button} type="submit" disabled={submitting}>
                            {submitting ? "Creating..." : "Create Project"}
                        </button>
                    </form>
                </div>

                {/* Project List */}
                <div style={styles.listCard}>
                    <h2 style={styles.title}>Existing Activities</h2>
                    {loading ? (
                        <div>Loading...</div>
                    ) : projects.length === 0 ? (
                        <div style={{ color: theme.colors.text.secondary }}>No projects found.</div>
                    ) : (
                        <div>
                            {projects.map((p, i) => (
                                <div key={i} style={styles.projectItem}>
                                    <div>
                                        <div style={{ fontWeight: "700", color: theme.colors.text.primary }}>{p.project_name}</div>
                                        <div style={{ fontSize: "13px", color: theme.colors.text.secondary }}>Leader: {p.leader_name}</div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <select
                                            style={{ ...styles.select, width: "auto", padding: "4px 8px", fontSize: "12px" }}
                                            value={p.status}
                                            onChange={(e) => handleStatusChange(p.id, e.target.value)}
                                        >
                                            <option value="Open">Open</option>
                                            <option value="Ongoing">Ongoing</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                cursor: "pointer",
                                                fontSize: "16px",
                                                color: theme.colors.error || "#ef4444"
                                            }}
                                            title="Delete Project"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    )
}
