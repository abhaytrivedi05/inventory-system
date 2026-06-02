import React, { useEffect, useState } from "react";
import { Package, Users, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { dashboardApi } from "../utils/api";

const STATUS_COLORS = {
  pending: "#fbbf24",
  processing: "#4f8ef7",
  shipped: "#a78bfa",
  delivered: "#34d399",
  cancelled: "#f87171",
};

const fmtCurrency = (v) => `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.stats()
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard…</div>;
  if (!stats) return <div className="empty-state"><p>Could not load stats.</p></div>;

  const statusData = Object.entries(stats.orders_by_status || {}).map(([name, value]) => ({ name, value }));

  const statCards = [
    { label: "Total Products", value: stats.total_products, icon: Package, color: "#4f8ef7", bg: "#1e3a6e" },
    { label: "Total Customers", value: stats.total_customers, icon: Users, color: "#34d399", bg: "#064e3b" },
    { label: "Total Orders", value: stats.total_orders, icon: ShoppingCart, color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
    { label: "Total Revenue", value: fmtCurrency(stats.total_revenue), icon: DollarSign, color: "#fbbf24", bg: "#451a03" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your inventory & orders</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div className="stat-card" key={label}>
            <div className="stat-card__icon" style={{ background: bg }}>
              <Icon size={18} color={color} />
            </div>
            <div className="stat-card__label">{label}</div>
            <div className="stat-card__value" style={{ color }}>{value}</div>
          </div>
        ))}
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: "#450a0a" }}>
            <AlertTriangle size={18} color="#f87171" />
          </div>
          <div className="stat-card__label">Low Stock Items</div>
          <div className="stat-card__value" style={{ color: "#f87171" }}>{stats.low_stock_count}</div>
          <div className="stat-card__sub">≤ 10 units</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 14, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Orders by Status
          </h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#666"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, "Orders"]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: "40px 0" }}><p>No order data yet</p></div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16, fontSize: 14, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Recent Orders
          </h3>
          {stats.recent_orders?.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "8px 0", textAlign: "left", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>ID</th>
                    <th style={{ padding: "8px 0", textAlign: "left", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "8px 0", textAlign: "right", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_orders.map(o => (
                    <tr key={o.id}>
                      <td style={{ padding: "10px 0", fontFamily: "var(--font-mono)", fontSize: 13, borderTop: "1px solid var(--border)" }}>#{o.id}</td>
                      <td style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
                        <span className={`badge badge--${o.status}`}>{o.status}</span>
                      </td>
                      <td style={{ padding: "10px 0", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, borderTop: "1px solid var(--border)", color: "var(--success)" }}>{fmtCurrency(o.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "40px 0" }}><p>No recent orders</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
