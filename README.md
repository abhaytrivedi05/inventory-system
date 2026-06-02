# Inventory & Order Management System

A full-stack web application for managing products, customers, orders, and inventory tracking.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Python 3.12 + FastAPI |
| Database | PostgreSQL 16 |
| Frontend | React 18 + React Router |
| Charts | Recharts |
| Containerization | Docker + Docker Compose |
| Frontend Server | Nginx |

---

## Features

- **Products** — CRUD with unique SKU enforcement, stock tracking, category & description
- **Customers** — CRUD with unique email enforcement
- **Orders** — Multi-item order creation with automatic stock deduction
- **Inventory Validation** — Orders rejected if stock is insufficient (per-product check)
- **Dashboard** — Live stats: revenue, order counts, low-stock alerts, status breakdown chart
- **Order Status** — Full lifecycle: pending → processing → shipped → delivered / cancelled
- **Stock Restoration** — Deleting an order restores product stock automatically

---

## Quick Start (Docker Compose)

### Prerequisites
- Docker ≥ 24
- Docker Compose v2

### Run locally

```bash
# 1. Clone
git clone <your-repo-url>
cd inventory-system

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum change POSTGRES_PASSWORD

# 3. Start all services
docker compose up --build

# App is live at:
#   Frontend  →  http://localhost
#   API       →  http://localhost:8000
#   API Docs  →  http://localhost:8000/docs
```

### Stop
```bash
docker compose down          # keep data
docker compose down -v       # wipe database volume too
```

---

## API Endpoints

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | `/products/` | List all (supports `?search=`) |
| POST | `/products/` | Create (unique SKU enforced) |
| GET | `/products/{id}` | Get by ID |
| PUT | `/products/{id}` | Update |
| DELETE | `/products/{id}` | Delete |

### Customers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/customers/` | List all (supports `?search=`) |
| POST | `/customers/` | Create (unique email enforced) |
| GET | `/customers/{id}` | Get by ID |
| PUT | `/customers/{id}` | Update |
| DELETE | `/customers/{id}` | Delete |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/orders/` | List all (supports `?status=`, `?customer_id=`) |
| POST | `/orders/` | Create order (validates stock, deducts inventory) |
| GET | `/orders/{id}` | Get by ID with items |
| PUT | `/orders/{id}/status` | Update order status |
| DELETE | `/orders/{id}` | Delete & restore stock |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/stats` | Aggregated stats for dashboard |

Full interactive docs: `http://localhost:8000/docs`

---

## Business Rules

1. **Unique SKU** — Creating or updating a product with a duplicate SKU returns HTTP 400.
2. **Unique Email** — Creating or updating a customer with a duplicate email returns HTTP 400.
3. **Stock Validation** — Order creation checks every line item against current stock; if any item is insufficient, the whole order is rejected with a descriptive error.
4. **Atomic Stock Deduction** — On successful order creation, all product quantities are decremented in the same database transaction.
5. **Stock Restoration** — Deleting an order increments product stock back.
6. **Order Status Lifecycle** — Status can be updated via dedicated endpoint; frontend provides inline dropdown on each row.

---

## Development (without Docker)

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Set env vars
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventory_db

uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8000 npm start
```

---

## Deployment (Free Tier)

### Backend — Render.com
1. Create a new **Web Service** pointing to `/backend`
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variable: `DATABASE_URL` (from Render's PostgreSQL add-on)
5. Add `ALLOWED_ORIGINS` with your frontend URL

### Database — Render PostgreSQL (free tier)
1. Create a new PostgreSQL instance on Render
2. Copy the internal connection string to `DATABASE_URL`

### Frontend — Vercel / Netlify
1. Set `REACT_APP_API_URL` to your Render backend URL
2. Build command: `npm run build`
3. Publish directory: `build`

### Docker Hub (image publishing)
```bash
# Build & push backend
docker build -t yourdockeruser/inventory-backend:latest ./backend
docker push yourdockeruser/inventory-backend:latest

# Build & push frontend
docker build \
  --build-arg REACT_APP_API_URL=https://your-backend.onrender.com \
  -t yourdockeruser/inventory-frontend:latest ./frontend
docker push yourdockeruser/inventory-frontend:latest
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `postgres` | DB username |
| `POSTGRES_PASSWORD` | `postgres` | DB password — **change in production** |
| `POSTGRES_DB` | `inventory_db` | Database name |
| `DATABASE_URL` | auto-constructed | Full PostgreSQL connection string |
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS origins |
| `REACT_APP_API_URL` | `http://localhost:8000` | Backend API URL (baked into frontend at build time) |

---

## Project Structure

```
inventory-system/
├── backend/
│   ├── main.py          # FastAPI app & routes
│   ├── models.py        # SQLAlchemy ORM models
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── crud.py          # Database operations
│   ├── database.py      # DB engine & session
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js       # Router & sidebar layout
│   │   ├── index.css    # Global styles
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── Products.js
│   │   │   ├── Customers.js
│   │   │   └── Orders.js
│   │   └── utils/api.js # Axios API client
│   ├── nginx.conf
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```
