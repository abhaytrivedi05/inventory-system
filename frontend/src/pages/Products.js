import React, { useEffect, useState, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, Package } from "lucide-react";
import toast from "react-hot-toast";
import { productApi } from "../utils/api";

const EMPTY_FORM = { name: "", sku: "", description: "", price: "", stock_quantity: "", category: "" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | "create" | "edit"
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    productApi.list(search ? { search } : {})
      .then(r => setProducts(r.data))
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setModal("create"); };
  const openEdit = (p) => {
    setForm({ name: p.name, sku: p.sku, description: p.description || "", price: p.price, stock_quantity: p.stock_quantity, category: p.category || "" });
    setEditing(p);
    setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, price: parseFloat(form.price), stock_quantity: parseInt(form.stock_quantity, 10) };
    try {
      if (modal === "edit") {
        await productApi.update(editing.id, payload);
        toast.success("Product updated");
      } else {
        await productApi.create(payload);
        toast.success("Product created");
      }
      closeModal();
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error saving product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    setDeleting(id);
    try {
      await productApi.delete(id);
      toast.success("Product deleted");
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error deleting product");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{products.length} item{products.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn btn--primary" onClick={openCreate}>
          <Plus size={15} /> Add Product
        </button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <Search size={15} />
          <input placeholder="Search by name, SKU, or category…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : products.length === 0 ? (
          <div className="empty-state"><Package size={40} /><p>No products found.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong>{p.description && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{p.description.slice(0, 60)}{p.description.length > 60 ? "…" : ""}</div>}</td>
                  <td className="td-mono">{p.sku}</td>
                  <td>{p.category || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td className="td-mono">${Number(p.price).toFixed(2)}</td>
                  <td>
                    <span className={`badge badge--${p.stock_quantity <= 10 ? "low" : "ok"}`}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="td-mono" style={{ color: "var(--text-muted)", fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn btn--ghost btn--sm btn--icon" onClick={() => openEdit(p)} title="Edit"><Edit2 size={14} /></button>
                      <button className="btn btn--danger btn--sm btn--icon" onClick={() => handleDelete(p.id)} disabled={deleting === p.id} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal">
            <div className="modal__header">
              <h2 className="modal__title">{modal === "edit" ? "Edit Product" : "New Product"}</h2>
              <button className="btn btn--ghost btn--sm btn--icon" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid form-grid--2">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU *</label>
                  <input className="form-input" required value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Price *</label>
                  <input className="form-input" type="number" step="0.01" min="0" required value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Quantity *</label>
                  <input className="form-input" type="number" min="0" required value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
