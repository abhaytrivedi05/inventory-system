import React, { useEffect, useState, useCallback } from "react";
import { Plus, Search, Trash2, ShoppingCart, Eye, X } from "lucide-react";
import toast from "react-hot-toast";
import { orderApi, customerApi, productApi } from "../utils/api";

const STATUS_OPTIONS = ["pending", "processing", "shipped", "delivered", "cancelled"];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal] = useState(null); // null | "create" | "view"
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ product_id: "", quantity: 1 }]);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    orderApi.list(filterStatus ? { status: filterStatus } : {})
      .then(r => setOrders(r.data))
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => {
    customerApi.list().then(r => setCustomers(r.data)).catch(console.error);
    productApi.list().then(r => setProducts(r.data)).catch(console.error);
  }, []);

  const openCreate = () => { setCustomerId(""); setNotes(""); setItems([{ product_id: "", quantity: 1 }]); setModal("create"); };
  const closeModal = () => { setModal(null); setViewing(null); };
  const openView = async (id) => {
    try {
      const r = await orderApi.get(id);
      setViewing(r.data);
      setModal("view");
    } catch { toast.error("Failed to load order"); }
  };

  const addItem = () => setItems(prev => [...prev, { product_id: "", quantity: 1 }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item));

  const calcTotal = () => items.reduce((sum, item) => {
    const p = products.find(p => String(p.id) === String(item.product_id));
    return sum + (p ? p.price * (parseInt(item.quantity) || 0) : 0);
  }, 0);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!customerId) return toast.error("Select a customer");
    const validItems = items.filter(i => i.product_id && parseInt(i.quantity) > 0);
    if (validItems.length === 0) return toast.error("Add at least one product");
    setSaving(true);
    try {
      await orderApi.create({ customer_id: parseInt(customerId), notes, items: validItems.map(i => ({ product_id: parseInt(i.product_id), quantity: parseInt(i.quantity) })) });
      toast.success("Order created!");
      closeModal();
      fetchOrders();
      // Refresh products for stock counts
      productApi.list().then(r => setProducts(r.data));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error creating order");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await orderApi.updateStatus(id, status);
      toast.success(`Status → ${status}`);
      fetchOrders();
      if (viewing?.id === id) setViewing(v => ({ ...v, status }));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error updating status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this order? Stock will be restored.")) return;
    try {
      await orderApi.delete(id);
      toast.success("Order deleted, stock restored");
      fetchOrders();
      productApi.list().then(r => setProducts(r.data));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error deleting order");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn btn--primary" onClick={openCreate}>
          <Plus size={15} /> New Order
        </button>
      </div>

      <div className="search-bar">
        <select className="form-select" style={{ width: "auto", minWidth: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state"><ShoppingCart size={40} /><p>No orders found.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Items</th>
                <th>Total</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="td-mono">#{o.id}</td>
                  <td>{o.customer?.name || `Customer #${o.customer_id}`}</td>
                  <td>
                    <select
                      className="form-select"
                      style={{ padding: "4px 8px", fontSize: 12, width: "auto" }}
                      value={o.status}
                      onChange={e => handleStatusChange(o.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? "s" : ""}</td>
                  <td className="td-mono" style={{ color: "var(--success)" }}>${Number(o.total_amount).toFixed(2)}</td>
                  <td className="td-mono" style={{ color: "var(--text-muted)", fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn btn--ghost btn--sm btn--icon" onClick={() => openView(o.id)} title="View"><Eye size={14} /></button>
                      <button className="btn btn--danger btn--sm btn--icon" onClick={() => handleDelete(o.id)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {modal === "create" && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal modal--lg">
            <div className="modal__header">
              <h2 className="modal__title">New Order</h2>
              <button className="btn btn--ghost btn--sm btn--icon" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-grid form-grid--2" style={{ marginBottom: 20 }}>
                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  <select className="form-select" required value={customerId} onChange={e => setCustomerId(e.target.value)}>
                    <option value="">Select customer…</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" />
                </div>
              </div>

              <div className="order-items-header">
                <span style={{ fontWeight: 600, fontSize: 13 }}>Order Items</span>
                <button type="button" className="btn btn--ghost btn--sm" onClick={addItem}><Plus size={13} /> Add Item</button>
              </div>

              {items.map((item, i) => {
                const p = products.find(p => String(p.id) === String(item.product_id));
                return (
                  <div className="order-item-row" key={i}>
                    <div className="form-group">
                      <label className="form-label">Product</label>
                      <select className="form-select" value={item.product_id} onChange={e => updateItem(i, "product_id", e.target.value)}>
                        <option value="">Select product…</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} — ${p.price.toFixed(2)} (stock: {p.stock_quantity})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Qty</label>
                      <input
                        className="form-input"
                        type="number"
                        min="1"
                        max={p?.stock_quantity || 9999}
                        value={item.quantity}
                        onChange={e => updateItem(i, "quantity", e.target.value)}
                      />
                    </div>
                    <button type="button" className="btn btn--danger btn--sm btn--icon" style={{ marginBottom: 2 }} onClick={() => removeItem(i)} disabled={items.length === 1}><X size={13} /></button>
                  </div>
                );
              })}

              <div className="order-total">
                Total: ${calcTotal().toFixed(2)}
              </div>

              <div className="modal__footer">
                <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? "Creating…" : "Create Order"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === "view" && viewing && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal modal--lg">
            <div className="modal__header">
              <h2 className="modal__title">Order #{viewing.id}</h2>
              <button className="btn btn--ghost btn--sm btn--icon" onClick={closeModal}>&times;</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <div className="form-label" style={{ marginBottom: 4 }}>Customer</div>
                <div>{viewing.customer?.name || `#${viewing.customer_id}`}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{viewing.customer?.email}</div>
              </div>
              <div>
                <div className="form-label" style={{ marginBottom: 4 }}>Status</div>
                <span className={`badge badge--${viewing.status}`}>{viewing.status}</span>
              </div>
              {viewing.notes && (
                <div style={{ gridColumn: "1/-1" }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>Notes</div>
                  <div style={{ color: "var(--text-secondary)" }}>{viewing.notes}</div>
                </div>
              )}
            </div>
            <table style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ padding: "8px 0", textAlign: "left", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Product</th>
                  <th style={{ padding: "8px 0", textAlign: "right", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Qty</th>
                  <th style={{ padding: "8px 0", textAlign: "right", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Unit Price</th>
                  <th style={{ padding: "8px 0", textAlign: "right", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {viewing.items?.map(item => (
                  <tr key={item.id}>
                    <td style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>{item.product?.name || `Product #${item.product_id}`}</td>
                    <td style={{ padding: "10px 0", borderTop: "1px solid var(--border)", textAlign: "right" }}>{item.quantity}</td>
                    <td style={{ padding: "10px 0", borderTop: "1px solid var(--border)", textAlign: "right", fontFamily: "var(--font-mono)" }}>${item.unit_price.toFixed(2)}</td>
                    <td style={{ padding: "10px 0", borderTop: "1px solid var(--border)", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--success)" }}>${(item.quantity * item.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color: "var(--accent)", marginTop: 16 }}>
              Total: ${Number(viewing.total_amount).toFixed(2)}
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
