from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas, crud
from database import engine, get_db
import os

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Inventory & Order Management API",
    description="API for managing products, customers, orders, and inventory",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health ──────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# ── Products ────────────────────────────────────────────────────────────────
@app.post("/products/", response_model=schemas.Product, status_code=201)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    existing = crud.get_product_by_sku(db, product.sku)
    if existing:
        raise HTTPException(status_code=400, detail=f"SKU '{product.sku}' already exists")
    return crud.create_product(db, product)

@app.get("/products/", response_model=List[schemas.Product])
def list_products(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_products(db, skip=skip, limit=limit, search=search)

@app.get("/products/{product_id}", response_model=schemas.Product)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = crud.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.put("/products/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, product: schemas.ProductUpdate, db: Session = Depends(get_db)):
    db_product = crud.get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.sku and product.sku != db_product.sku:
        if crud.get_product_by_sku(db, product.sku):
            raise HTTPException(status_code=400, detail=f"SKU '{product.sku}' already exists")
    return crud.update_product(db, product_id, product)

@app.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    if not crud.get_product(db, product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    crud.delete_product(db, product_id)

# ── Customers ───────────────────────────────────────────────────────────────
@app.post("/customers/", response_model=schemas.Customer, status_code=201)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    if crud.get_customer_by_email(db, customer.email):
        raise HTTPException(status_code=400, detail=f"Email '{customer.email}' already registered")
    return crud.create_customer(db, customer)

@app.get("/customers/", response_model=List[schemas.Customer])
def list_customers(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_customers(db, skip=skip, limit=limit, search=search)

@app.get("/customers/{customer_id}", response_model=schemas.Customer)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@app.put("/customers/{customer_id}", response_model=schemas.Customer)
def update_customer(customer_id: int, customer: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    db_customer = crud.get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if customer.email and customer.email != db_customer.email:
        if crud.get_customer_by_email(db, customer.email):
            raise HTTPException(status_code=400, detail=f"Email '{customer.email}' already registered")
    return crud.update_customer(db, customer_id, customer)

@app.delete("/customers/{customer_id}", status_code=204)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    if not crud.get_customer(db, customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")
    crud.delete_customer(db, customer_id)

# ── Orders ───────────────────────────────────────────────────────────────────
@app.post("/orders/", response_model=schemas.Order, status_code=201)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    if not crud.get_customer(db, order.customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")
    # Validate stock for all items before creating
    for item in order.items:
        product = crud.get_product(db, item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}': requested {item.quantity}, available {product.stock_quantity}"
            )
    return crud.create_order(db, order)

@app.get("/orders/", response_model=List[schemas.Order])
def list_orders(
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_orders(db, skip=skip, limit=limit, customer_id=customer_id, status=status)

@app.get("/orders/{order_id}", response_model=schemas.Order)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@app.put("/orders/{order_id}/status", response_model=schemas.Order)
def update_order_status(order_id: int, status_update: schemas.OrderStatusUpdate, db: Session = Depends(get_db)):
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    return crud.update_order_status(db, order_id, status_update.status)

@app.delete("/orders/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    if not crud.get_order(db, order_id):
        raise HTTPException(status_code=404, detail="Order not found")
    crud.delete_order(db, order_id)

# ── Dashboard Stats ──────────────────────────────────────────────────────────
@app.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    return crud.get_dashboard_stats(db)
