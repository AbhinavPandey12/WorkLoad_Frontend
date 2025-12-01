import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";


export default function LoginScreen({ onLogin }) {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Responsive state
    const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 900);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Basic validation
        if (!email || !password) {
            setError("Please fill in all required fields.");
            return;
        }

        const emailRegex = /^[^\s@]+@tatatechnologies\.com$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.");
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
                setError(data.error || "Something went wrong");
                setLoading(false);
                return;
            }

            if (data.success) {
                if (typeof onLogin === "function") onLogin(data.user);

                const role_type = (data.user?.role_type || "").trim().toLowerCase();
                if (role_type === "manager") {
                    navigate("/dashboard");
                } else {
                    navigate("/details");
                }
            } else {
                setError(data.error || "Invalid credentials");
            }
        } catch (err) {
            setError("Failed to connect to server. Make sure backend is running.");

        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: {
            minHeight: "100vh",
            background: "linear-gradient(180deg, #f4f7fb 0%, #ffffff 40%)",
            padding: isMobile ? "8px 12px" : "12px 20px",
            fontFamily: "Segoe UI, Tahoma, sans-serif",
        },
        content: {
            maxWidth: "500px",
            margin: "40px auto",
            padding: isMobile ? "24px" : "30px 40px",
            background: "#fff",
            borderRadius: "16px",
            boxShadow: "0 18px 48px rgba(12,36,72,0.08)",
            border: "1px solid #eef2f6",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
        },
        logo: {
            width: "150px",
            marginBottom: "20px",
            maxWidth: "100%",
        },
        title: {
            fontSize: "26px",
            fontWeight: "700",
            color: "#072a53",
            marginBottom: "20px",
            marginTop: "0",
            textAlign: "center",
        },
        welcome: {
            fontSize: "18px",
            fontWeight: "500",
            color: "#4b5563",
            marginBottom: "24px",
            marginTop: "-10px",
            textAlign: "center",
            letterSpacing: "0.5px",
        },
        formGroup: {
            marginBottom: "20px",
            width: "100%",
        },
        label: {
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#374151",
        },
        input: {
            width: "100%",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid #e8eef6",
            background: "#fbfdff",
            fontSize: "15px",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
            color: "#1f2937",
            boxSizing: "border-box",
        },
        button: {
            width: "100%",
            padding: "14px",
            marginTop: "10px",
            borderRadius: "12px",
            background: "linear-gradient(90deg, #0078d4, #005fa3)",
            color: "#fff",
            border: "none",
            fontSize: "16px",
            fontWeight: "700",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 10px 30px rgba(3, 45, 85, 0.15)",
            opacity: loading ? 0.8 : 1,
            transition: "transform 0.1s",
        },
        error: {
            padding: "12px",
            marginBottom: "20px",
            borderRadius: "8px",
            textAlign: "center",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: "14px",
            fontWeight: "500",
            border: "1px solid #fee2e2",
            width: "100%",
            boxSizing: "border-box",
        },
        footer: {
            marginTop: "40px",
            color: "#888",
            fontSize: "12px",
            textAlign: "center",
        },
    };

    return (
        <div style={styles.container}>


            <div style={styles.content}>
                <img src="/logo/Bluebird_logo_white.png" alt="Bluebird Logo" style={styles.logo} />
                <h3 style={styles.welcome}>Welcome to the Bluebird Star App</h3>
                <h2 style={styles.title}>Login</h2>

                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ width: "100%" }}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                            disabled={loading}
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            disabled={loading}
                        />
                    </div>
                    <button type="submit" style={styles.button} disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                    </button>

                    <div style={{ marginTop: "15px", textAlign: "center" }}>
                        <a
                            href="https://forms.office.com/Pages/ResponsePage.aspx?id=YHed29djiE-ZJ_q-RG4jYu30tAiE4QZGndZ48sb8fWhUOTAxN0RFT0RCRzVXUDZYWEc1RUhORE1RSi4u&fswReload=1&fswNavStart=1764070424016"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#0078d4", textDecoration: "none", fontSize: "14px", fontWeight: "500" }}
                        >
                            Facing Problem on Logging?
                        </a>
                    </div>
                </form>

                <p style={styles.footer}>© 2025 Tata Technologies</p>
            </div>
        </div>
    );
}
