import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { API_URL } from "../config";
import Loader from "../components/Loader";
import { Container, Row, Col, Card, Form, Alert } from "react-bootstrap";

// Hook to track last updated time for specific data
const useLastUpdated = (data) => {
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleDateString());
    const prevDataRef = React.useRef(data);

    useEffect(() => {
        // Simple deep comparison via JSON.stringify
        if (JSON.stringify(data) !== JSON.stringify(prevDataRef.current)) {
            setLastUpdated(new Date().toLocaleDateString());
            prevDataRef.current = data;
        }
    }, [data]);

    return lastUpdated;
};

export default function DashboardPage({ onLogout }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState({
        partialHoursDistribution: {},
        clusters: { "MEBM": 0, "M&T": 0, "S&PS Insitu": 0, "S&PS Exsitu": 0 },
        roles: {}
    });
    const [capacityFilter, setCapacityFilter] = useState("All"); // All, Daily, Weekly, Monthly

    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    // Calculate last updated times
    const capacityData = { partial: metrics.totalPartialHours, available: metrics.totalAvailableHours };
    const capacityLastUpdated = useLastUpdated(capacityData);

    const clustersLastUpdated = useLastUpdated(metrics.clusters);
    const rolesLastUpdated = useLastUpdated(metrics.roles);


    useEffect(() => {
        const storedUser = sessionStorage.getItem("user");
        if (!storedUser) {
            if (onLogout) onLogout();
            else navigate("/");
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        if ((parsedUser.role_type || "").trim().toLowerCase() !== "manager") {
            navigate("/home");
        }
    }, [navigate, onLogout]);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const res = await fetch(`${API_URL}/api/employees/dashboard-metrics?range=${capacityFilter}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" }
                });
                if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
                const data = await res.json();
                setMetrics(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchMetrics();
    }, [capacityFilter]);

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            sessionStorage.clear();
            navigate("/");
        }
    };

    // --- Components ---

    const ChartCard = ({ title, action, children, updatedAt }) => (
        <Card
            className="h-100 shadow-sm border-0"
            style={{ borderRadius: "0px", backgroundColor: "#ecf4f8ff", transition: "all 0.25s ease", cursor: "pointer" }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px)"
                e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,0,0,0.09)"
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = ""
            }}
        >
            <Card.Body className="d-flex flex-column p-4">
                <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                    <h3 className="h5 fw-bold text-dark m-0">{title}</h3>
                    {action && <div>{action}</div>}
                </div>
                <div className="flex-grow-1 d-flex justify-content-center align-items-center w-100">
                    {children}
                </div>
                <div className="text-muted small text-end mt-4 pt-2 border-top">
                    Updated at {updatedAt || new Date().toLocaleDateString()}
                </div>
            </Card.Body>
        </Card>
    );

    // New Chart for Capacity Totals (Vertical Comparison)
    const CapacityComparisonChart = ({ partial, available, partialCount, availableCount }) => {
        const data = [
            { label: "Partial Available", value: partial, color: "#f59e0b", count: partialCount },
            { label: "Available", value: available, color: "#22c55e", count: availableCount }
        ];
        const maxVal = Math.max(partial, available, 10);

        // Responsive SVG settings
        const viewBoxWidth = 400;
        const viewBoxHeight = 300;
        const padding = { top: 40, right: 20, bottom: 60, left: 50 };
        const innerWidth = viewBoxWidth - padding.left - padding.right;
        const innerHeight = viewBoxHeight - padding.top - padding.bottom;
        const barWidth = 60;

        return (
            <div className="w-100 h-100 d-flex flex-column pb-3">
                <div className="flex-grow-1 d-flex align-items-center justify-content-center">
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
                            const x = padding.left + (innerWidth / 4) + (i * (innerWidth / 2)) - (barWidth / 2);
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
                                    <text x={x + barWidth / 2} y={y - 10} textAnchor="middle" fontSize="14" fontWeight="bold" fill={d.color}>
                                        {d.value}h
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
                {/* Legend */}
                <div className="d-flex flex-column gap-2 mt-3 small text-secondary align-self-start ps-2">
                    <div className="d-flex align-items-center gap-2">
                        <div style={{ width: "12px", height: "12px", background: "#f59e0b", borderRadius: "2px" }}></div>
                        <span>Total Partial Hours ({partialCount || 0} people)</span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <div style={{ width: "12px", height: "12px", background: "#22c55e", borderRadius: "2px" }}></div>
                        <span>Total Available Hours ({availableCount || 0} people)</span>
                    </div>
                </div>
            </div>
        );
    };

    // Horizontal Bar Chart for Clusters
    const HorizontalBarChart = ({ data, color = "#3b82f6" }) => {
        const entries = Object.entries(data);
        if (entries.length === 0) return <div className="text-muted fst-italic">No data available</div>;

        const maxVal = Math.max(...Object.values(data), 1);

        return (
            <div className="d-flex flex-column gap-3 w-100">
                {entries.map(([key, val]) => (
                    <div key={key} className="d-flex align-items-center gap-3">
                        <div style={{ width: "100px", fontSize: "13px", textAlign: "right", flexShrink: 0 }} className="text-secondary text-truncate">
                            {key}
                        </div>
                        <div className="flex-grow-1 bg-light rounded position-relative d-flex align-items-center overflow-hidden" style={{ height: "24px" }}>
                            <div
                                style={{
                                    height: "100%",
                                    width: `${(val / maxVal) * 100}%`,
                                    background: color,
                                    borderRadius: "4px",
                                    transition: "width 0.5s ease-out"
                                }}
                            />
                            <span className="position-absolute end-0 me-2 small fw-bold text-dark">{val}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Pie Chart for Roles (SVG)
    const PieChart = ({ data }) => {
        const entries = Object.entries(data);
        if (entries.length === 0) return <div className="text-muted fst-italic">No data available</div>;

        const total = Object.values(data).reduce((a, b) => a + b, 0);
        const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1"];

        let cumulativePercent = 0;

        const slices = entries.map(([label, val], idx) => {
            const percent = val / total;
            const startPercent = cumulativePercent;
            cumulativePercent += percent;
            const endPercent = cumulativePercent;

            const getCoords = (p) => {
                const x = Math.cos(2 * Math.PI * p);
                const y = Math.sin(2 * Math.PI * p);
                return [x, y];
            };

            const [startX, startY] = getCoords(startPercent);
            const [endX, endY] = getCoords(endPercent);
            const largeArcFlag = percent > 0.5 ? 1 : 0;
            const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

            return {
                label,
                val,
                percent,
                color: colors[idx % colors.length],
                pathData
            };
        });

        return (
            <div className="d-flex flex-column align-items-center w-100 gap-4">
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
                <div className="d-flex flex-wrap justify-content-center gap-2">
                    {slices.map((item) => (
                        <div key={item.label} className="d-flex align-items-center gap-1 small text-dark">
                            <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: item.color }} />
                            <span>{item.label} ({item.val})</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) return (
        <div className="vh-100 d-flex justify-content-center align-items-center">
            <Loader />
        </div>
    );

    return (
        <div className="min-vh-100 bg-light">
            <Navbar user={user} onLogout={handleLogout} title="Manager Dashboard" />

            <Container fluid="lg" className="py-4">
                {/* Heading Removed */}

                {error && (
                    <Alert variant="danger" className="mb-4">
                        Error loading data: {error}
                    </Alert>
                )}

                <Row className="g-4">
                    {/* 1. Capacity Overview */}
                    <Col xs={12} lg={4}>
                        <ChartCard
                            title="Capacity Overview"
                            updatedAt={capacityLastUpdated}
                            action={
                                <Form.Select
                                    size="sm"
                                    value={capacityFilter}
                                    onChange={(e) => setCapacityFilter(e.target.value)}
                                    style={{ width: "auto", fontWeight: "500" }}
                                >
                                    {/* <option value="All">All Time</option> */}
                                    <option value="Daily">Today</option>
                                    <option value="Weekly">This Week</option>
                                    <option value="Monthly">This Month</option>
                                </Form.Select>
                            }
                        >
                            <div className="w-100 h-100 d-flex flex-column">
                                <span className="small text-muted mb-2">Assuming 176 hrs/month per person</span>
                                <div style={{ minHeight: "300px", width: "100%" }}>
                                    <CapacityComparisonChart
                                        partial={metrics.totalPartialHours || 0}
                                        available={metrics.totalAvailableHours || 0}
                                        partialCount={metrics.partialEmployeeCount || 0}
                                        availableCount={metrics.availableEmployeeCount || 0}
                                    />
                                </div>
                            </div>
                        </ChartCard>
                    </Col>

                    {/* 2. Users per Cluster */}
                    <Col xs={12} lg={4}>
                        <ChartCard title="Cluster based Distribution" updatedAt={clustersLastUpdated}>
                            <HorizontalBarChart data={metrics.clusters} color="#3b82f6" />
                        </ChartCard>
                    </Col>

                    {/* 3. Users per Role */}
                    <Col xs={12} lg={4}>
                        <ChartCard title="Role based Distribution" updatedAt={rolesLastUpdated}>
                            <PieChart data={metrics.roles} />
                        </ChartCard>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
