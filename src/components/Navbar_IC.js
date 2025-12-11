import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// Replace Container usage with fluid
import { Navbar, Nav, Container, Offcanvas, Dropdown, Button } from "react-bootstrap";

import { toast } from "react-toastify";

export default function Navbar_IC({ user, onLogout, title = "Employee Dashboard" }) {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);

    const handleClose = () => setShowMenu(false);
    const handleShow = () => setShowMenu(true);

    const getInitials = (name) => {
        if (!name) return "U";
        return name.split(" ").map((word) => word[0]).join("").toUpperCase();
    };

    const getInitialsColor = (nm) => {
        const colors = ["#0072bc", "#d32f2f", "#2e7d32", "#f57c00", "#7b1fa2"];
        const n = (nm || " ").toString();
        let hash = 0;
        for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const profileName = (user && (user.name || "")) || "User";
    const profileInitials = getInitials(profileName);
    const profileBg = getInitialsColor(profileName);

    return (
        <>
            <Navbar fixed="top" expand={false} className="mb-0 py-3" style={{ background: "#6ea8fe", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }} variant="light">
                <Container fluid className="px-4 d-flex flex-nowrap align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <Button variant="link" onClick={handleShow} className="p-0 me-3" style={{ color: "#052c65" }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" y1="12" x2="20" y2="12"></line>
                                <line x1="4" y1="6" x2="20" y2="6"></line>
                                <line x1="4" y1="18" x2="20" y2="18"></line>
                            </svg>
                        </Button>
                        <Navbar.Brand onClick={() => navigate("/details")} style={{ cursor: "pointer", color: "#052c65", fontWeight: "600", fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "10px" }}>

                            {title}
                        </Navbar.Brand>
                    </div>

                    <div className="d-flex align-items-center gap-3">
                        <div
                            onClick={() => toast.info("No notifications received yet!")}
                            style={{ cursor: "pointer", color: "#052c65" }}
                            title="Notifications"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                        </div>

                        <Dropdown align="end">
                            <Dropdown.Toggle as="div" id="dropdown-profile" style={{ cursor: "pointer" }} bsPrefix="custom-toggle">
                                <div
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "50%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: profileBg,
                                        border: "2px solid rgba(255,255,255,0.12)",
                                        color: "#fff",
                                        fontWeight: "700",
                                        fontSize: "14px"
                                    }}
                                >
                                    {profileInitials}
                                </div>
                            </Dropdown.Toggle>

                            <Dropdown.Menu style={{ minWidth: "180px", borderRadius: "8px", boxShadow: "0 8px 28px rgba(2,6,23,0.12)" }}>
                                <Dropdown.Item onClick={() => navigate("/profile")} className="d-flex align-items-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg> Profile
                                </Dropdown.Item>
                                <Dropdown.Item onClick={() => navigate("/reset-password")} className="d-flex align-items-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                                        <circle cx="7.5" cy="15.5" r="5.5"></circle>
                                        <path d="m21 2-9.6 9.6"></path>
                                        <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
                                    </svg> Reset Password
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={() => { onLogout && onLogout(); navigate("/"); }} className="d-flex align-items-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-2">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                        <polyline points="16 17 21 12 16 7"></polyline>
                                        <line x1="21" y1="12" x2="9" y2="12"></line>
                                    </svg> Logout
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                </Container>
            </Navbar>

            <Offcanvas show={showMenu} onHide={handleClose} style={{ width: "250px", background: "#0c86afff", color: "white" }}>
                <Offcanvas.Header style={{ borderBottom: "2px solid rgba(255,255,255,0.2)", padding: "10px 0px" }}>
                    <div className="d-flex align-items-center gap-2">
                        <img src="/Logo/MainLogo.png" alt="Logo" style={{ height: "65px", objectFit: "contain" }} />
                        <span style={{ fontSize: "20px", fontWeight: "bold", letterSpacing: "0.5px", whiteSpace: "nowrap", marginLeft: "-10px" }}>Bluebird Star</span>
                    </div>
                </Offcanvas.Header>
                <Offcanvas.Body className="p-0">
                    <Nav className="flex-column px-1 py-4 gap-2">
                        <Nav.Link onClick={() => { handleClose(); navigate("/details"); }} className="text-white px-2 py-2 rounded d-flex align-items-center" style={{ fontWeight: "500", letterSpacing: "0.3px", transition: "all 0.2s" }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-3 opacity-75">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                            Details
                        </Nav.Link>
                        <Nav.Link onClick={() => { handleClose(); navigate("/inline-activities"); }} className="text-white px-2 py-2 rounded d-flex align-items-center" style={{ fontWeight: "500", letterSpacing: "0.3px", transition: "all 0.2s" }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-3 opacity-75">
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                <line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                            Inline Activities
                        </Nav.Link>
                        <Nav.Link onClick={() => { handleClose(); window.open("https://forms.gle/68Wx9e9W6wVEw9PTA", "_blank"); }} className="text-white px-2 py-2 rounded d-flex align-items-center" style={{ fontWeight: "500", letterSpacing: "0.3px", transition: "all 0.2s" }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-3 opacity-75">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            Feedback
                        </Nav.Link>
                    </Nav>
                </Offcanvas.Body>
            </Offcanvas>
        </>
    );
}
