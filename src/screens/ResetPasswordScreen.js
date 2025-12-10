import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Container, Card, Form, Spinner } from "react-bootstrap";
import { API_URL } from "../config";
import Navbar from "../components/Navbar";

export default function ResetPasswordScreen({ user, onLogout }) {
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.warn("Please fill in all fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.warn("New passwords do not match.");
            return;
        }

        if (currentPassword === newPassword) {
            toast.warn("New Password cannot be the same as Current Password.");
            return;
        }

        if (newPassword.length < 6) {
            toast.warn("Password must be at least 6 characters long.");
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

            if (response.ok && data.success) {
                toast.success("Password updated successfully! Redirecting to login...");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");

                // Wait a moment then logout and redirect
                setTimeout(() => {
                    if (onLogout) onLogout();
                    navigate("/");
                }, 1500);
            } else {
                toast.error(data.error || "Failed to update password.");
            }
        } catch (err) {
            // console.error("Reset password error:", err);
            toast.error("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 bg-light">
            <Navbar user={user} onLogout={onLogout} title="Reset Password" />

            <Container className="py-5">
                <Card className="shadow-sm border-0 mx-auto" style={{ borderRadius: "0px", maxWidth: "600px" }}>
                    <Card.Body className="p-4">
                        {/* Heading removed */}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Current Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    disabled={loading}
                                    className="rounded-0"
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">New Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    disabled={loading}
                                    className="rounded-0"
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label className="fw-semibold">Confirm Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    disabled={loading}
                                    className="rounded-0"
                                />
                            </Form.Group>

                            <button
                                type="submit"
                                className="btn w-100 fw-bold py-2"
                                disabled={loading}
                                style={{
                                    backgroundColor: "#6ea8fe",
                                    color: "#052c65",
                                    borderRadius: "0px",
                                    border: "none"
                                }}
                            >
                                {loading ? <Spinner animation="border" size="sm" /> : "Update Password"}
                            </button>
                        </Form>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
}
