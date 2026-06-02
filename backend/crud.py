from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import models, schemas

# ── Products ─────────────────────────────────────────────────────────────────
def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(models.Product).filter(models.Product.sku == sku).first()

def get_products(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    q = db.query(models.Product)
    if search:
        q = q.filter(
            or_(
                models.Product.name.ilike(f"%{search}%"),
                models.Product.sku.ilike(f"%{search}%"),
                models.Product.category.ilike(f"%{search}%"),
            )
        )
    return q.offset(skip).limit(limit).all()

def create_product(db: Session, product: schemas.ProductCreate):
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: int, product: schemas.ProductUpdate):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    for field, value in product.model_dump(exclude_unset=True).items():
        setattr(db_product, field, value)
    db.commit()
    db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    db.delete(db_product)
    db.commit()

# ── Customers ─────────────────────────────────────────────────────────────────
def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def get_customer_by_email(db: Session, email: str):
    return db.query(models.Customer).filter(models.Customer.email == email).first()

def get_customers(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    q = db.query(models.Customer)
    if search:
        q = q.filter(
            or_(
                models.Customer.name.ilike(f"%{search}%"),
                models.Customer.email.ilike(f"%{search}%"),
            )
        )
    return q.offset(skip).limit(limit).all()

def create_customer(db: Session, customer: schemas.CustomerCreate):
    db_customer = models.Customer(**customer.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def update_customer(db: Session, customer_id: int, customer: schemas.CustomerUpdate):
    db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    for field, value in customer.model_dump(exclude_unset=True).items():
        setattr(db_customer, field, value)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def delete_customer(db: Session, customer_id: int):
    db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    db.delete(db_customer)
    db.commit()

# ── Orders ────────────────────────────────────────────────────────────────────
def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def get_orders(db: Session, skip: int = 0, limit: int = 100, customer_id: int = None, status: str = None):
    q = db.query(models.Order)
    if customer_id:
        q = q.filter(models.Order.customer_id == customer_id)
    if status:
        q = q.filter(models.Order.status == status)
    return q.order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()

def create_order(db: Session, order: schemas.OrderCreate):
    total = 0.0
    items_data = []

    for item in order.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        unit_price = product.price
        total += unit_price * item.quantity
        items_data.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": unit_price,
        })
        # Deduct stock
        product.stock_quantity -= item.quantity

    db_order = models.Order(
        customer_id=order.customer_id,
        status="pending",
        total_amount=round(total, 2),
        notes=order.notes,
    )
    db.add(db_order)
    db.flush()

    for item_data in items_data:
        db_item = models.OrderItem(order_id=db_order.id, **item_data)
        db.add(db_item)

    db.commit()
    db.refresh(db_order)
    return db_order

def update_order_status(db: Session, order_id: int, status: str):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    db_order.status = status
    db.commit()
    db.refresh(db_order)
    return db_order

def delete_order(db: Session, order_id: int):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    # Restore stock on delete
    for item in db_order.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            product.stock_quantity += item.quantity
    db.delete(db_order)
    db.commit()

# ── Dashboard ─────────────────────────────────────────────────────────────────
def get_dashboard_stats(db: Session):
    total_products = db.query(func.count(models.Product.id)).scalar()
    total_customers = db.query(func.count(models.Customer.id)).scalar()
    total_orders = db.query(func.count(models.Order.id)).scalar()
    total_revenue = db.query(func.sum(models.Order.total_amount)).filter(
        models.Order.status != "cancelled"
    ).scalar() or 0.0

    low_stock = db.query(models.Product).filter(models.Product.stock_quantity <= 10).count()

    orders_by_status = (
        db.query(models.Order.status, func.count(models.Order.id))
        .group_by(models.Order.status)
        .all()
    )

    recent_orders = (
        db.query(models.Order)
        .order_by(models.Order.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "low_stock_count": low_stock,
        "orders_by_status": {status: count for status, count in orders_by_status},
        "recent_orders": [
            {
                "id": o.id,
                "customer_id": o.customer_id,
                "status": o.status,
                "total_amount": o.total_amount,
                "created_at": o.created_at.isoformat(),
            }
            for o in recent_orders
        ],
    }
