import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"

export default function Navbar_IC({ user, onLogout, title = "Employee Dashboard" }) {
    const navigate = useNavigate()
    const [profileOpen, setProfileOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const profileRef = useRef(null)
    const menuRef = useRef(null)

    // mobile detection
    const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false)
    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 900)
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [])

    // close dropdowns on outside click / ESC
    useEffect(() => {
        function handleOutside(e) {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false)
            }
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false)
            }
        }
        function handleEsc(e) {
            if (e.key === "Escape") {
                setProfileOpen(false)
                setMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handleOutside)
        document.addEventListener("keydown", handleEsc)
        return () => {
            document.removeEventListener("mousedown", handleOutside)
            document.removeEventListener("keydown", handleEsc)
        }
    }, [])

    const getInitials = (name) => {
        if (!name) return "U"
        return name.split(" ").map((word) => word[0]).join("").toUpperCase()
    }

    const getInitialsColor = (nm) => {
        const colors = ["#0072bc", "#d32f2f", "#2e7d32", "#f57c00", "#7b1fa2"]
        const n = (nm || " ").toString()
        let hash = 0
        for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash)
        return colors[Math.abs(hash) % colors.length]
    }

    const profileName = (user && (user.name || "")) || "User"
    const profileInitials = getInitials(profileName)
    const profileBg = getInitialsColor(profileName)

    const styles = {
        header: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(90deg, #016db9 0%, #0078d4 100%)",
            color: "white",
            padding: isMobile ? "16px 20px" : "20px 32px", // Increased padding
            borderRadius: "0", // Full width
            marginBottom: "0", // Flush with container
            gap: "12px",
            position: "relative",
        },
        leftArea: { display: "flex", alignItems: "center", gap: 12 },
        hamburger: {
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 4,
        },
        title: { margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: "600" },
        rightArea: { display: "flex", alignItems: "center", gap: "12px" },
        profileButton: {
            width: isMobile ? 40 : 44,
            height: isMobile ? 40 : 44,
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            border: "2px solid rgba(255,255,255,0.12)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
            userSelect: "none",
            background: profileBg,
        },
        profileInitials: {
            color: "white",
            fontWeight: 700,
            fontSize: isMobile ? 14 : 16,
            lineHeight: 1,
        },
        dropdown: {
            position: "absolute",
            top: isMobile ? 50 : 60,
            background: "white",
            borderRadius: 8,
            boxShadow: "0 8px 28px rgba(2,6,23,0.12)",
            minWidth: 180,
            zIndex: 100,
            overflow: "hidden",
            border: "1px solid #e9eef6",
            right: 0,
        },
        // Sliding Menu Styles
        overlay: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)", // Slightly lighter overlay
            zIndex: 200,
            opacity: menuOpen ? 1 : 0,
            visibility: menuOpen ? "visible" : "hidden",
            transition: "opacity 0.3s ease",
            backdropFilter: "blur(2px)", // Added blur for aesthetics
        },
        drawer: {
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: "280px",
            background: "linear-gradient(90deg, #016db9 0%, #0078d4 100%)",
            zIndex: 201,
            boxShadow: "6px 0 20px rgba(0,0,0,0.15)",
            transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
            display: "flex",
            flexDirection: "column",
            paddingTop: "20px",
        },
        drawerHeader: {
            padding: "0 20px 20px 20px", // Reduced padding
            borderBottom: "1px solid rgba(255,255,255,0.3)", // Whiter line
            marginBottom: "10px",
        },
        drawerTitle: {
            margin: 0,
            fontSize: "20px", // Slightly smaller
            fontWeight: "600",
            color: "#ffffff",
            letterSpacing: "0.5px",
        },
        drawerMenuItem: {
            padding: "12px 20px", // More compact spacing
            cursor: "pointer",
            fontSize: 15,
            fontWeight: "500",
            color: "rgba(255,255,255,0.9)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            textDecoration: "none",
            transition: "all 0.2s ease",
            borderLeft: "4px solid transparent",
        },
        dropdownMenuItem: {
            padding: "12px 16px",
            cursor: "pointer",
            fontSize: 14,
            color: "#0b5fa5",
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
        },
    }

    const HamburgerIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
    )

    return (
        <>
            {/* Sliding Drawer & Overlay */}
            <div style={styles.overlay} onClick={() => setMenuOpen(false)} />
            <div style={styles.drawer}>
                <div style={styles.drawerHeader}>
                    <h2 style={styles.drawerTitle}>Menu</h2>
                </div>

                <div
                    style={styles.drawerMenuItem}
                    onClick={() => {
                        setMenuOpen(false)
                        navigate("/details")
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                        e.currentTarget.style.borderLeft = "4px solid #ffffff"
                        e.currentTarget.style.color = "#ffffff"
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent"
                        e.currentTarget.style.borderLeft = "4px solid transparent"
                        e.currentTarget.style.color = "rgba(255,255,255,0.9)"
                    }}
                >
                    <span>📋</span> Details
                </div>
                <div
                    style={styles.drawerMenuItem}
                    onClick={() => {
                        setMenuOpen(false)
                        navigate("/inline-activities")
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                        e.currentTarget.style.borderLeft = "4px solid #ffffff"
                        e.currentTarget.style.color = "#ffffff"
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent"
                        e.currentTarget.style.borderLeft = "4px solid transparent"
                        e.currentTarget.style.color = "rgba(255,255,255,0.9)"
                    }}
                >
                    <span>📅</span> Inline Activities
                </div>
                <div
                    style={styles.drawerMenuItem}
                    onClick={() => {
                        setMenuOpen(false)
                        window.open("https://forms.office.com/Pages/ResponsePage.aspx?id=YHed29djiE-ZJ_q-RG4jYu30tAiE4QZGndZ48sb8fWhUOTAxN0RFT0RCRzVXUDZYWEc1RUhORE1RSi4u&fswReload=1&fswNavStart=1764070424016", "_blank")
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                        e.currentTarget.style.borderLeft = "4px solid #ffffff"
                        e.currentTarget.style.color = "#ffffff"
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent"
                        e.currentTarget.style.borderLeft = "4px solid transparent"
                        e.currentTarget.style.color = "rgba(255,255,255,0.9)"
                    }}
                >
                    <span>💬</span> Feedback
                </div>
            </div>

            <header style={styles.header}>
                <div style={styles.leftArea}>
                    {/* Hamburger Trigger */}
                    <div style={styles.hamburger} onClick={() => setMenuOpen(true)}>
                        <HamburgerIcon />
                    </div>

                    <img
                        src="/Logo/MainLogo.png"
                        alt="Main Logo"
                        style={{ height: isMobile ? 32 : 40, objectFit: "contain", background: "white", borderRadius: 4, cursor: "pointer" }}
                        onClick={() => navigate("/details")}
                    />
                    <h1 style={styles.title}>{title}</h1>
                </div>

                <div style={styles.rightArea}>
                    <div
                        onClick={() => alert("No notifications received yet!")}
                        style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                        title="Notifications"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                    </div>

                    <div style={{ position: "relative" }} ref={profileRef}>
                        <div
                            onClick={() => setProfileOpen(!profileOpen)}
                            style={styles.profileButton}
                            title={profileName}
                        >
                            <span style={styles.profileInitials}>{profileInitials}</span>
                        </div>

                        {profileOpen && (
                            <div style={{ ...styles.dropdown, right: 0 }}>
                                <div
                                    style={styles.dropdownMenuItem}
                                    onClick={() => {
                                        setProfileOpen(false)
                                        navigate("/profile")
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8ff")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                    <span>👤</span> Profile
                                </div>
                                <div
                                    style={styles.dropdownMenuItem}
                                    onClick={() => {
                                        setProfileOpen(false)
                                        navigate("/reset-password")
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8ff")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                    <span>🔑</span> Reset Password
                                </div>
                                <div
                                    style={styles.dropdownMenuItem}
                                    onClick={() => {
                                        setProfileOpen(false)
                                        onLogout && onLogout()
                                        navigate("/")
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f8ff")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                    <span>🔒</span> Logout
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </>
    )
}
