import React from "react"
import Navbar from "../components/Navbar"
import { theme } from "../utils/theme"
import { useIsMobile } from "../hooks/useIsMobile"

/**
 * Standardized Page Layout component.
 * Handles the full-width Navbar, sticky positioning, and responsive content padding.
 * 
 * @param {Object} props
 * @param {Object} props.user - Current user object
 * @param {Function} props.onLogout - Logout handler
 * @param {string} props.title - Page title for the Navbar
 * @param {boolean} props.stickyNav - Whether the Navbar should be sticky (default: false)
 * @param {React.ReactNode} props.children - Page content
 */
export default function PageLayout({
    user,
    onLogout,
    title,
    stickyNav = false,
    fluid = false,
    children
}) {
    const isMobile = useIsMobile()

    const styles = {
        page: {
            minHeight: "100vh",
            background: theme.colors.background,
            fontFamily: theme.typography.fontFamily,
            padding: 0, // Ensure full width for Navbar
            display: "flex",
            flexDirection: "column",
        },
        navWrapper: stickyNav ? {
            position: "sticky",
            top: 0,
            zIndex: 1000,
            width: "100%",
        } : {
            width: "100%",
        },
        contentContainer: {
            flex: 1,
            padding: isMobile ? "12px" : "20px",
            width: "100%",
            maxWidth: "100%", // Ensure content doesn't overflow horizontally
            boxSizing: "border-box",
        },
        // Optional: Inner centered container for content that shouldn't stretch too wide
        centeredContent: {
            maxWidth: fluid ? "100%" : "1280px",
            margin: "0 auto",
            width: "100%",
        }
    }

    return (
        <div style={styles.page}>
            <div style={styles.navWrapper}>
                <Navbar user={user} onLogout={onLogout} title={title} />
            </div>
            <div style={styles.contentContainer}>
                <div style={styles.centeredContent}>
                    {children}
                </div>
            </div>
        </div>
    )
}
