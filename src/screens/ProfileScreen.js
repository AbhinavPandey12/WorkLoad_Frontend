// Frontend/src/screens/ProfileScreen.js
import React, { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { Row, Col, Alert } from "react-bootstrap";
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
    { label: "Organization Head", value: "Organization Head" },
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
  
  const [stars, setStars] = useState(0)

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
    
    setStars(employee.stars || 0);
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
          
          if (obj.stars !== undefined) {
             setStars(obj.stars);
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

  // --- UI Styles ---
  const styles = {
    page: {
      background: "#f3f4f6", // Very light cool gray
      minHeight: "100vh",
      paddingBottom: "40px"
    },
    container: {
      maxWidth: "900px",
      margin: "0 auto",
      paddingTop: "20px"
    },
    mainCard: {
      border: "none",
      borderRadius: "16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
      overflow: "hidden",
      background: "#ffffff"
    },
    headerBanner: {
      background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)", // Professional Blue Gradient
      height: "80px", // Reduced height since no overlap
      position: "relative"
    },
    backBtn: {
      position: "absolute",
      top: "24px",
      left: "24px",
      background: "rgba(255,255,255,0.9)", // Solid white with slight transparency for feel
      color: "#1e3a8a", // Deep blue text
      border: "none",
      fontSize: "13px",
      fontWeight: "700",
      padding: "8px 20px",
      borderRadius: "100px", // Pill shape
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      transition: "all 0.2s ease"
    },
    // ... profileHeaderContent ...
    profileHeaderContent: {
      position: "relative",
      marginTop: "0px",
      padding: "30px 40px 10px 40px", // Adjusted padding
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "20px"
    },
    avatarContainer: {
      width: "120px",
      height: "120px",
      borderRadius: "50%",
      border: "4px solid #ffffff",
      background: "#e0e7ff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "48px",
      color: "#3730a3",
      fontWeight: "bold",
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
    },
    nameSection: {
      marginBottom: "10px",
      flex: 1
    },
    name: {
      fontSize: "28px",
      fontWeight: "800",
      color: "#111827",
      margin: 0
    },
    idBadge: {
      display: "inline-block",
      background: "#f3f4f6",
      color: "#4b5563",
      fontSize: "13px",
      fontWeight: "600",
      padding: "4px 12px",
      borderRadius: "20px",
      marginTop: "4px"
    },
    starsContainer: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: "#fffbeb",
      border: "1px solid #fcd34d",
      padding: "8px 16px",
      borderRadius: "12px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
      marginBottom: "10px"
    },
    starCount: {
      fontSize: "20px",
      fontWeight: "800",
      color: "#d97706"
    },
    sectionTitle: {
      fontSize: "12px",
      textTransform: "uppercase",
      letterSpacing: "1px",
      fontWeight: "700",
      color: "#9ca3af",
      marginBottom: "16px",
      borderBottom: "1px solid #f3f4f6",
      paddingBottom: "8px"
    },
    formGroup: {
      marginBottom: "24px"
    },
    label: {
      fontSize: "13px",
      fontWeight: "600",
      color: "#374151",
      marginBottom: "8px",
      display: "block"
    },
    input: {
      padding: "12px 16px",
      borderRadius: "8px",
      border: "1px solid #e5e7eb",
      fontSize: "14px",
      color: "#111827",
      width: "100%",
      background: "#f9fafb",
      transition: "all 0.2s"
    },
    select: {
      padding: "12px 16px",
      borderRadius: "8px",
      border: "1px solid #e5e7eb",
      fontSize: "14px",
      color: "#111827",
      width: "100%",
      background: "#ffffff",
      cursor: "pointer"
    },
    clusterBtn: (selected) => ({
      padding: "8px 16px",
      borderRadius: "8px",
      border: selected ? "1px solid #3b82f6" : "1px solid #e5e7eb",
      background: selected ? "#eff6ff" : "#ffffff",
      color: selected ? "#1d4ed8" : "#4b5563",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s"
    }),
    saveBtn: {
      background: "#2563eb",
      color: "#ffffff",
      border: "none",
      padding: "12px 32px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
      transition: "all 0.2s"
    },
    readOnlyBox: {
        background: "#f3f4f6",
        border: "1px solid transparent",
        color: "#6b7280"
    }
  }

  const getInitials = (n) => {
      if(!n) return "?";
      return n.split(" ").map(w => w[0]).join("").substring(0,2).toUpperCase();
  }

  return (
    <div style={styles.page}>
      <Navbar user={employee} onLogout={onLogout} title="My Profile" />

      <div style={styles.container}>
        <div style={styles.mainCard}>
          {/* Header Banner */}
          <div style={styles.headerBanner}>
            {onBack && (
              <button 
                onClick={onBack} 
                style={styles.backBtn}
                onMouseEnter={e => e.target.style.background = "#ffffff"} // Pure white on hover
                onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.9)"} // Back to 0.9 on leave
              >
                ← Back to Dashboard
              </button>
            )}
          </div>

          {/* Profile Identity Section */}
          <div style={styles.profileHeaderContent}>
            <div style={{ display: "flex", gap: "24px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={styles.avatarContainer}>
                    {getInitials(name)}
                </div>
                <div style={styles.nameSection}>
                    <h1 style={styles.name}>{name || "Employee Name"}</h1>
                    <div style={styles.idBadge}>ID: {employee_id}</div>
                </div>
            </div>

            <div style={styles.starsContainer}>
                <span className="text-secondary small fw-bold text-uppercase" style={{ letterSpacing: "1px", fontSize: "11px" }}>Reputation</span>
                <span style={{ width: "1px", height: "20px", background: "#e5e7eb", margin: "0 4px" }}></span>
                <span style={styles.starCount}>{stars}</span>
                <IconStar />
            </div>
          </div>

          <div style={{ padding: "40px 40px" }}>
            {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
            
            <Row>
                {/* Left Column: Personal Info (Read Only) */}
                <Col md={5} className="pe-md-5 mb-4 mb-md-0" style={{ borderRight: "1px solid #f3f4f6" }}>
                    <div style={styles.sectionTitle}>Personal Information</div>
                    
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input 
                            style={{ ...styles.input, ...styles.readOnlyBox }} 
                            value={email} 
                            disabled 
                        />
                         <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "6px" }}>
                             Contact HR to update email address.
                         </div>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>System ID</label>
                        <input 
                            style={{ ...styles.input, ...styles.readOnlyBox }} 
                            value={employee_id} 
                            disabled 
                        />
                    </div>
                </Col>

                {/* Right Column: Editable Work Details */}
                <Col md={7} className="ps-md-5">
                    <div style={styles.sectionTitle}>Work Details & Preferences</div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Designation / Role</label>
                        <select 
                            style={styles.select} 
                            value={role} 
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option value="">Select your role</option>
                            {ROLE.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        {role === "Other" && (
                            <input 
                                style={{ ...styles.input, marginTop: "12px" }}
                                placeholder="Please specify your role..." 
                                value={otherRole} 
                                onChange={(e) => setOtherRole(e.target.value)} 
                            />
                        )}
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Cluster Assignment</label>
                        <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "12px" }}>
                            <div className="d-flex gap-4 mb-3 pb-3 border-bottom border-light">
                                <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer" }}>
                                    <input 
                                        type="radio" 
                                        name="clusterMode" 
                                        checked={clusterMode === "Single"}
                                        onChange={() => {
                                            setClusterMode("Single");
                                            setSelectedClusters(selectedClusters.slice(0, 1));
                                        }}
                                    />
                                    <span style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>Single Cluster</span>
                                </label>
                                <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer" }}>
                                    <input 
                                        type="radio" 
                                        name="clusterMode" 
                                        checked={clusterMode === "Multiple"}
                                        onChange={() => setClusterMode("Multiple")}
                                    />
                                    <span style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>Multiple (Max 2)</span>
                                </label>
                            </div>
                            
                            <div className="d-flex flex-wrap gap-2">
                                {CLUSTER_OPTIONS.map(opt => {
                                    const isSelected = selectedClusters.includes(opt.value);
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => toggleCluster(opt.value)}
                                            style={styles.clusterBtn(isSelected)}
                                        >
                                            {opt.label}
                                        </button>
                                    )
                                })}
                            </div>
                            {errors.clusters && (
                                <div style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px", fontWeight: "500" }}>
                                    ⚠ {errors.clusters}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: "40px", display: "flex", justifyContent: "flex-end" }}>
                        <button 
                            style={styles.saveBtn}
                            onClick={handleSave}
                            disabled={saving}
                            onMouseEnter={e => e.target.style.transform = "translateY(-1px)"}
                            onMouseLeave={e => e.target.style.transform = "translateY(0)"}
                        >
                            {saving ? "Saving Changes..." : "Save Profile Changes"}
                        </button>
                    </div>
                </Col>
            </Row>
          </div>
        </div>
      </div>
    </div>
  )
}
