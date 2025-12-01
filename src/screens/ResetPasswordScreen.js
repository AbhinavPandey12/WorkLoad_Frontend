import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import Navbar from "../components/Navbar";

export default function ResetPasswordScreen({ user, onLogout }) {
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // Responsive state
    const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false);

    React.useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 900);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        if (currentPassword === newPassword) {
            setError("New Password cannot be the same as Current Password.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/auth/update-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    empid: user.empid,
                    currentPassword,
                    newPassword
                }),
            });

            const data = await response.json();
            // console.log("[ResetPassword] Response:", response.status, data);

            if (response.ok && data.success) {
                setMessage("Password updated successfully! Redirecting to login...");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");

                // Wait a moment then logout and redirect
                setTimeout(() => {
                    if (onLogout) onLogout();
                    navigate("/");
                }, 1500);
            } else {
                setError(data.error || "Failed to update password.");
            }
        } catch (err) {
            // console.error("Reset password error:", err);
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: {
            minHeight: "100vh",
            background: "linear-gradient(180deg, #f4f7fb 0%, #ffffff 40%)",
            padding: "0", // Removed padding for full width Navbar
            fontFamily: "Segoe UI, Tahoma, sans-serif",
        },
        innerContainer: {
            padding: isMobile ? "8px 12px" : "12px 20px",
        },
        content: {
            maxWidth: "500px",
            margin: "40px auto",
            padding: isMobile ? "24px" : "30px 40px",
            background: "#fff",
            borderRadius: "16px",
            boxShadow: "0 18px 48px rgba(12,36,72,0.08)",
            border: "1px solid #eef2f6",
        },
        title: {
            fontSize: "26px",
            fontWeight: "700",
            color: "#072a53",
            marginBottom: "20px",
            marginTop: "0",
            textAlign: "center",
        },
        formGroup: {
            marginBottom: "20px",
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
        message: {
            padding: "12px",
            marginBottom: "20px",
            borderRadius: "8px",
            textAlign: "center",
            background: "#ecfdf5",
            color: "#047857",
            fontSize: "14px",
            fontWeight: "500",
            border: "1px solid #d1fae5",
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
        },
    };

    return (
        <div style={styles.container}>
            <Navbar user={user} onLogout={onLogout} title="Reset Password" />
            <div style={styles.innerContainer}>
                <div style={styles.content}>
                    <h2 style={styles.title}>Change Password</h2>

                    {message && <div style={styles.message}>{message}</div>}
                    {error && <div style={styles.error}>{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Current Password</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                style={styles.input}
                                disabled={loading}
                                placeholder="Enter current password"
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={styles.input}
                                disabled={loading}
                                placeholder="Enter new password"
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                style={styles.input}
                                disabled={loading}
                                placeholder="Confirm new password"
                            />
                        </div>
                        <button type="submit" style={styles.button} disabled={loading}>
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
