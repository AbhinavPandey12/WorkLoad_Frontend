import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import { API_URL } from "../config"
import Loader from "../components/Loader"

// Hook to track last updated time for specific data
const useLastUpdated = (data) => {
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleDateString())
    const prevDataRef = React.useRef(data)

    useEffect(() => {
        // Simple deep comparison via JSON.stringify
        if (JSON.stringify(data) !== JSON.stringify(prevDataRef.current)) {
            setLastUpdated(new Date().toLocaleDateString())
            prevDataRef.current = data
        }
    }, [data])

    return lastUpdated
}

export default function DashboardPage({ onLogout }) {

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [metrics, setMetrics] = useState({
        partialHoursDistribution: {},
        clusters: { "MEBM": 0, "M&T": 0, "S&PS Insitu": 0, "S&PS Exsitu": 0 },
        roles: {}
    })
    const [capacityFilter, setCapacityFilter] = useState("All") // All, Daily, Weekly, Monthly

    const navigate = useNavigate()
    const [user, setUser] = useState(null)

    const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 900 : false)

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 900)
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [])

    // Calculate last updated times
    const capacityData = { partial: metrics.totalPartialHours, available: metrics.totalAvailableHours }
    const capacityLastUpdated = useLastUpdated(capacityData)

    const clustersLastUpdated = useLastUpdated(metrics.clusters)
    const rolesLastUpdated = useLastUpdated(metrics.roles)


    useEffect(() => {
        const storedUser = sessionStorage.getItem("user")
        if (!storedUser) {
            // If no user in session, we might want to trigger logout to be safe, 
            // but mostly we just redirect.
            // However, if we are here, App.js thought we were logged in.
            // So calling onLogout() is better to sync App state.
            if (onLogout) onLogout();
            else navigate("/")
            return
        }
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)

        if ((parsedUser.role_type || "").trim().toLowerCase() !== "manager") {
            navigate("/home") // ICs shouldn't see this
        }
    }, [navigate, onLogout])

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const res = await fetch(`${API_URL}/api/employees/dashboard-metrics?range=${capacityFilter}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" }
                })
                if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`)
                const data = await res.json()
                // console.log("[Dashboard] Metrics fetched:", data)
                setMetrics(data)
            } catch (err) {
                // console.error("Dashboard fetch error:", err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchMetrics()
    }, [capacityFilter])

    const handleLogout = () => {
        // Use the prop from App.js which clears state AND session storage
        if (onLogout) {
            onLogout()
        } else {
            // Fallback if prop missing (shouldn't happen)
            sessionStorage.clear()
            navigate("/")
        }
    }

    // --- Styles ---
    const styles = {
        page: {
            minHeight: "100vh",
            background: "#f3f4f6",
            fontFamily: "Segoe UI, Tahoma, sans-serif",
            padding: "0", // Removed padding for full width Navbar
        },
        // navWrapper removed as it's no longer needed
        innerContainer: {
            padding: isMobile ? "8px 12px" : "12px 20px",
        },
        container: {
            maxWidth: "1200px",
            margin: "0 auto",
        },
        pageHeader: {
            fontSize: "24px",
            fontWeight: "700",
            color: "#1f2937",
            marginBottom: "24px",
        },
        grid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "24px",
        },
        chartContainer: {
            background: "white",
            padding: "24px",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            minHeight: "460px", // Increased height for better visibility
            border: "1px solid #f3f4f6",
        },
        chartHeader: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            borderBottom: "1px solid #f3f4f6",
            paddingBottom: "16px",
        },
        chartTitle: {
            fontSize: "18px",
            fontWeight: "700",
            color: "#111827",
            margin: 0,
        },
        chartContent: {
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
        },
        noData: {
            color: "#9ca3af",
            fontStyle: "italic",
        },
        // Horizontal Bars
        bars: {
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "100%",
        },
        barRow: {
            display: "flex",
            alignItems: "center",
            gap: "12px",
        },
        barLabel: {
            width: "100px",
            fontSize: "13px",
            color: "#4b5563",
            textAlign: "right",
            flexShrink: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
        },
        barTrack: {
            flex: 1,
            background: "#f3f4f6",
            height: "24px",
            borderRadius: "4px",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
        },
        barFill: {
            height: "100%",
            borderRadius: "4px",
            transition: "width 0.5s ease-out",
        },
        barValue: {
            marginLeft: "8px",
            fontSize: "12px",
            fontWeight: "600",
            color: "#374151",
            position: "absolute",
            right: "8px",
        },
        // Vertical Bars
        verticalBarChart: {
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-around",
            height: "200px",
            width: "100%",
            gap: "8px",
        },
        vBarCol: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            height: "100%",
        },
        vBarTrack: {
            flex: 1,
            width: "100%",
            maxWidth: "40px",
            display: "flex",
            alignItems: "flex-end", // Grow from bottom
            background: "#f3f4f6",
            borderRadius: "4px",
            overflow: "hidden",
            position: "relative",
        },
        vBarFill: {
            width: "100%",
            borderRadius: "4px 4px 0 0",
            transition: "height 0.5s ease-out",
        },
        vBarLabel: {
            marginTop: "8px",
            fontSize: "12px",
            color: "#4b5563",
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
        },
        vBarValue: {
            fontSize: "11px",
            fontWeight: "600",
            color: "#374151",
        },
        // Pie Chart
        pieChartWrapper: {
            display: "flex",
            flexDirection: "column", // Stack pie and legend on mobile/small cards
            alignItems: "center",
            gap: "20px",
            width: "100%",
        },
        pieCircle: {
            // Removed: using SVG now
        },
        legend: {
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            justifyContent: "center",
        },
        legendItem: {
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
        },
        legendColor: {
            width: "10px",
            height: "10px",
            borderRadius: "2px",
        },
        legendText: {
            color: "#374151",
        },
        loading: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            fontSize: "18px",
            color: "#6b7280",
        }
    }

    // --- Components ---

    // --- Components ---



    const ChartCard = ({ title, action, children, updatedAt }) => (
        <div style={styles.chartContainer}>
            <div style={styles.chartHeader}>
                <h3 style={styles.chartTitle}>{title}</h3>
                {action && <div>{action}</div>}
            </div>
            <div style={styles.chartContent}>
                {children}
            </div>
            <div style={{ marginTop: "auto", paddingTop: "16px", fontSize: "12px", color: "#9ca3af", textAlign: "right", width: "100%" }}>
                Updated at {updatedAt || new Date().toLocaleDateString()}
            </div>
        </div>
    )

    // New Chart for Capacity Totals (Vertical Comparison)
    const CapacityComparisonChart = ({ partial, available, partialCount, availableCount }) => {
        const data = [
            { label: "Partial Available", value: partial, color: "#f59e0b", count: partialCount },
            { label: "Available", value: available, color: "#22c55e", count: availableCount }
        ];
        const maxVal = Math.max(partial, available, 10); // Ensure scale

        // Responsive SVG settings
        const viewBoxWidth = 400;
        const viewBoxHeight = 300;
        const padding = { top: 40, right: 20, bottom: 60, left: 50 }; // Increased bottom padding for X-axis labels if needed
        const innerWidth = viewBoxWidth - padding.left - padding.right;
        const innerHeight = viewBoxHeight - padding.top - padding.bottom;
        const barWidth = 60;

        return (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="100%" height="100%" viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: "visible" }}>
                        {/* Y-Axis Grid */}
                        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                            const y = padding.top + innerHeight * (1 - t);
                            const val = Math.round(maxVal * t);
                            return (
                                <g key={t}>
                                    <line x1={padding.left} y1={y} x2={viewBoxWidth - padding.right} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
                                    <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#9ca3af">{val}</text>
                                </g>
                            );
                        })}

                        {/* Bars */}
                        {data.map((d, i) => {
                            const x = padding.left + (innerWidth / 4) + (i * (innerWidth / 2)) - (barWidth / 2); // Center bars in halves
                            const barHeight = (d.value / maxVal) * innerHeight;
                            const y = padding.top + innerHeight - barHeight;

                            return (
                                <g key={d.label}>
                                    <rect
                                        x={x}
                                        y={y}
                                        width={barWidth}
                                        height={barHeight}
                                        fill={d.color}
                                        rx="4"
                                    />
                                    {/* Value on top */}
                                    <text x={x + barWidth / 2} y={y - 10} textAnchor="middle" fontSize="14" fontWeight="bold" fill={d.color}>
                                        {d.value}h
                                    </text>
                                    {/* Label at bottom */}
                                    {/* <text x={x + barWidth / 2} y={viewBoxHeight - 15} textAnchor="middle" fontSize="12" fontWeight="600" fill="#374151">
                                    {d.label}
                                </text> */}
                                </g>
                            );
                        })}
                    </svg>
                </div>
                {/* Legend */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginTop: "16px",
                    fontSize: "12px",
                    color: "#374151",
                    alignSelf: "flex-start", // Bottom Left
                    paddingLeft: "10px"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "12px", height: "12px", background: "#f59e0b", borderRadius: "2px" }}></div>
                        <span>Total Partial Hours ({partialCount || 0} people)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "12px", height: "12px", background: "#22c55e", borderRadius: "2px" }}></div>
                        <span>Total Available Hours ({availableCount || 0} people)</span>
                    </div>
                </div>
            </div>
        );
    };



    // Horizontal Bar Chart for Clusters
    const HorizontalBarChart = ({ data, color = "#3b82f6" }) => {
        const entries = Object.entries(data)
        if (entries.length === 0) return <div style={styles.noData}>No data available</div>

        const maxVal = Math.max(...Object.values(data), 1)

        return (
            <div style={styles.bars}>
                {entries.map(([key, val]) => (
                    <div key={key} style={styles.barRow}>
                        <div style={styles.barLabel}>{key}</div>
                        <div style={styles.barTrack}>
                            <div
                                style={{
                                    ...styles.barFill,
                                    width: `${(val / maxVal) * 100}%`,
                                    background: color
                                }}
                            />
                            <span style={styles.barValue}>{val}</span>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    // Pie Chart for Roles (SVG)
    const PieChart = ({ data }) => {
        const entries = Object.entries(data)
        if (entries.length === 0) return <div style={styles.noData}>No data available</div>

        const total = Object.values(data).reduce((a, b) => a + b, 0)
        const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1"]

        let cumulativePercent = 0

        const slices = entries.map(([label, val], idx) => {
            const percent = val / total
            const startPercent = cumulativePercent
            cumulativePercent += percent
            const endPercent = cumulativePercent

            // Calculate coordinates (x, y) on unit circle
            const getCoords = (p) => {
                const x = Math.cos(2 * Math.PI * p)
                const y = Math.sin(2 * Math.PI * p)
                return [x, y]
            }

            const [startX, startY] = getCoords(startPercent)
            const [endX, endY] = getCoords(endPercent)

            // Determine if the slice is > 50%
            const largeArcFlag = percent > 0.5 ? 1 : 0

            // SVG Path command
            // M 0 0 (center) -> L startX startY -> A radius radius 0 largeArcFlag 1 endX endY -> Z
            const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`

            return {
                label,
                val,
                percent,
                color: colors[idx % colors.length],
                pathData
            }
        })

        return (
            <div style={styles.pieChartWrapper}>
                <svg viewBox="-1 -1 2 2" style={{ width: "160px", height: "160px", transform: "rotate(-90deg)" }}>
                    {slices.map((slice) => (
                        <path
                            key={slice.label}
                            d={slice.pathData}
                            fill={slice.color}
                            stroke="white"
                            strokeWidth="0.02"
                            style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                            onMouseOver={(e) => e.target.style.opacity = 0.8}
                            onMouseOut={(e) => e.target.style.opacity = 1}
                        >
                            <title>{`${slice.label}: ${slice.val} (${(slice.percent * 100).toFixed(1)}%)`}</title>
                        </path>
                    ))}
                </svg>
                <div style={styles.legend}>
                    {slices.map((item) => (
                        <div key={item.label} style={styles.legendItem}>
                            <div style={{ ...styles.legendColor, background: item.color }} />
                            <div style={styles.legendText}>
                                {item.label} ({item.val})
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (loading) return (
        <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Loader />
        </div>
    )





    return (
        <div style={styles.page}>
            <Navbar user={user} onLogout={handleLogout} title="Manager Dashboard" />

            <div style={styles.innerContainer}>
                <div style={styles.container}>
                    <h1 style={styles.pageHeader}>Dashboard</h1>

                    {error && (
                        <div style={{
                            padding: "12px",
                            background: "#fee2e2",
                            color: "#b91c1c",
                            borderRadius: "8px",
                            marginBottom: "24px",
                            border: "1px solid #fca5a5"
                        }}>
                            Error loading data: {error}
                        </div>
                    )}

                    <div style={styles.grid}>
                        {/* 1. Capacity Overview */}
                        <ChartCard
                            title="Capacity Overview"
                            updatedAt={capacityLastUpdated}
                            action={
                                <select
                                    value={capacityFilter}
                                    onChange={(e) => setCapacityFilter(e.target.value)}
                                    style={{
                                        padding: "8px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #e5e7eb",
                                        fontSize: "13px",
                                        outline: "none",
                                        cursor: "pointer",
                                        background: "#f9fafb",
                                        color: "#374151",
                                        fontWeight: "500"
                                    }}
                                >
                                    <option value="All">All Time</option>
                                    <option value="Daily">Today</option>
                                    <option value="Weekly">This Week</option>
                                    <option value="Monthly">This Month</option>
                                </select>
                            }
                        >
                            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>Assuming 176 hrs/month/person</span>
                                <div style={{ height: "90%", width: "100%" }}>
                                    <CapacityComparisonChart
                                        partial={metrics.totalPartialHours || 0}
                                        available={metrics.totalAvailableHours || 0}
                                        partialCount={metrics.partialEmployeeCount || 0}
                                        availableCount={metrics.availableEmployeeCount || 0}
                                    />
                                </div>
                            </div>
                        </ChartCard>

                        {/* 2. Users per Cluster */}
                        <ChartCard title="Users per Cluster" updatedAt={clustersLastUpdated}>
                            <HorizontalBarChart data={metrics.clusters} color="#3b82f6" />
                        </ChartCard>

                        {/* 3. Users per Role */}
                        <ChartCard title="Users per Role" updatedAt={rolesLastUpdated}>
                            <PieChart data={metrics.roles} />
                        </ChartCard>
                    </div>
                </div>
            </div>
        </div>
    )
}
