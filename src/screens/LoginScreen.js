import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Form, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import { API_URL } from "../config";

export default function LoginScreen({ onLogin }) {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Basic validation
        if (!email || !password) {
            const msg = "Please fill in all required fields.";
            setError(msg);
            toast.warn(msg);
            return;
        }

        const emailRegex = /^[^\s@]+@tatatechnologies\.com$/;
        if (!emailRegex.test(email)) {
            const msg = "Please enter a valid email address.";
            setError(msg);
            toast.warn(msg);
            return;
        }

        setLoading(true);

        try {
            const endpoint = "/api/auth/login";
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errMsg = data.error || "Something went wrong";
                setError(errMsg);
                toast.error(errMsg);
                setLoading(false);
                return;
            }

            if (data.success) {
                toast.success(`Welcome back, ${data.user.name || "User"}!`);
                if (typeof onLogin === "function") onLogin(data.user);

                const role_type = (data.user?.role_type || "").trim().toLowerCase();
                if (role_type === "manager") {
                    navigate("/dashboard");
                } else {
                    navigate("/details");
                }
            } else {
                const errMsg = data.error || "Invalid credentials";
                setError(errMsg);
                toast.error(errMsg);
            }
        } catch (err) {
            console.error("Login Error:", err);
            const errMsg = `Failed to connect to server at ${API_URL}. Error: ${err.message}`;
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "radial-gradient(at 0% 0%, hsla(210, 80%, 95%, 1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(220, 80%, 90%, 1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(200, 80%, 95%, 1) 0, transparent 50%)", // Blue modern gradient
            backgroundImage: "radial-gradient(at 40% 20%, hsla(215,100%,94%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(205,100%,92%,1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(220,100%,96%,1) 0px, transparent 50%)", // Blue elegant mesh
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000
        }}>
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "100%" }}>
                <Card className="p-4 shadow-sm border-0" style={{ maxWidth: "400px", width: "100%", borderRadius: "0px" }}>
                    <Card.Body>
                        <div className="text-center mb-4">
                            <img src="../../Logo/Bluebird_logo_white.png" alt="Bluebird Logo" style={{ maxWidth: "150px", marginBottom: "20px" }} />
                            <h2 className="fw-bold mt-0" style={{ color: "#312e81", fontSize: "26px" }}>Login</h2>
                        </div>

                        {error && <Alert variant="danger" className="text-center rounded-0">{error}</Alert>}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3" controlId="formBasicEmail">
                                <Form.Label className="fw-bold" style={{ color: "#374151" }}>Email Address</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="Enter your email @tatatechnologies.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    className="p-3"
                                    style={{
                                        background: "#fbfdff",
                                        borderRadius: "0px",
                                        border: "1px solid #e8eef6"
                                    }}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="formBasicPassword">
                                <Form.Label className="fw-bold" style={{ color: "#374151" }}>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    className="p-3"
                                    style={{
                                        background: "#fbfdff",
                                        borderRadius: "0px",
                                        border: "1px solid #e8eef6"
                                    }}
                                />
                            </Form.Group>

                            <button type="submit" className="btn w-100 p-3 fw-bold mt-2" disabled={loading}
                                style={{
                                    backgroundColor: "#6ea8fe", // Blue 300
                                    border: "none",
                                    borderRadius: "0px",
                                    color: "#052c65", // Dark Blue for professional contrast
                                    boxShadow: "none"
                                }}>
                                {loading ? "Login" : "Login"}
                            </button>
                        </Form>

                        <div className="text-center mt-3">
                            <a
                                href="https://forms.office.com/r/WukVsTZ1ad"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-decoration-none"
                                style={{ color: "#3d8bfd", fontWeight: "600", fontSize: "14px" }}
                            >
                                Facing Problem Logging in?
                            </a>
                        </div>
                        <div className="text-center mt-4 text-muted small" style={{ color: "#888" }}>
                            © 2025 Tata Technologies
                        </div>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
}
