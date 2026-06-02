import React, { useEffect, useState, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import { customerApi } from "../utils/api";

const EMPTY_FORM = { name: "", email: "", phone: "", address: "" };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    customerApi.list(search ? { search } : {})
      .then(r => setCustomers(r.data))
      .catch(() => toast.error("Failed to load customers"))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setModal("create"); };
  const openEdit = (c) => { setForm({ name: c.name, email: c.email, phone: c.phone || "", address: c.address || "" }); setEditing(c); setModal("edit"); };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === "edit") {
        await customerApi.update(editing.id, form);
        toast.success("Customer updated");
      } else {
        await customerApi.create(form);
        toast.success("Customer created");
      }
      closeModal();
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error saving customer");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer? This may affect existing orders.")) return;
    try {
      await customerApi.delete(id);
      toast.success("Customer deleted");
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error deleting customer");
    }
  };

  const f = (k) => e => setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{customers.length} customer{customers.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn btn--primary" onClick={openCreate}>
          <Plus size={15} /> Add Customer
        </button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <Search size={15} />
          <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : customers.length === 0 ? (
          <div className="empty-state"><Users size={40} /><p>No customers found.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td className="td-mono" style={{ color: "var(--accent)" }}>{c.email}</td>
                  <td>{c.phone || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.address || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td className="td-mono" style={{ color: "var(--text-muted)", fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn btn--ghost btn--sm btn--icon" onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                      <button className="btn btn--danger btn--sm btn--icon" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal">
            <div className="modal__header">
              <h2 className="modal__title">{modal === "edit" ? "Edit Customer" : "New Customer"}</h2>
              <button className="btn btn--ghost btn--sm btn--icon" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid form-grid--2">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" required value={form.name} onChange={f("name")} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" required value={form.email} onChange={f("email")} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={f("phone")} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Address</label>
                <textarea className="form-textarea" value={form.address} onChange={f("address")} />
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
