"""
MongoDB Transaction Usage Examples
Demonstrates different patterns for using transactions in the application.
"""
from typing import List
from bson import ObjectId
from app.services.db import TransactionContext, execute_transaction, start_transaction


# Example 1: Using TransactionContext (Recommended)
async def create_order_with_stock_decrement(order_data: dict, items: List[dict]):
    """
    Create order and decrement stock atomically using TransactionContext.
    
    This is the recommended pattern for most use cases.
    Automatically commits on success, rolls back on exception.
    """
    from app.services.db import get_db
    
    db = get_db()
    orders = db["orders"]
    inventory = db["inventory"]
    
    async with TransactionContext() as session:
        # Insert order
        order_result = await orders.insert_one(order_data, session=session)
        order_id = order_result.inserted_id
        
        # Decrement stock for each item
        for item in items:
            result = await inventory.update_one(
                {
                    "_id": ObjectId(item["product_id"]),
                    "variants.id": item["variant_id"],
                    # Atomic check: ensure sufficient stock
                    "$expr": {
                        "$gte": [
                            {"$subtract": ["$variants.$.stock_quantity", "$variants.$.reserved"]},
                            item["quantity"]
                        ]
                    }
                },
                {
                    "$inc": {"variants.$.reserved": item["quantity"]}
                },
                session=session
            )
            
            if result.modified_count == 0:
                # Insufficient stock - exception will trigger rollback
                raise ValueError(f"Insufficient stock for {item['product_id']}")
        
        return order_id
    # Transaction automatically committed here if no exception


# Example 2: Using execute_transaction with lambda functions
async def transfer_inventory_between_warehouses(
    product_id: str,
    from_warehouse: str,
    to_warehouse: str,
    quantity: int
):
    """
    Transfer inventory between warehouses atomically.
    
    Uses execute_transaction with lambda functions.
    """
    from app.services.db import get_db
    
    db = get_db()
    inventory = db["inventory"]
    
    operations = [
        # Decrement from source warehouse
        lambda s: inventory.update_one(
            {"product_id": product_id, "warehouse": from_warehouse},
            {"$inc": {"quantity": -quantity}},
            session=s
        ),
        # Increment in destination warehouse
        lambda s: inventory.update_one(
            {"product_id": product_id, "warehouse": to_warehouse},
            {"$inc": {"quantity": quantity}},
            session=s
        )
    ]
    
    results = await execute_transaction(operations)
    return results


# Example 3: Manual session management (Advanced)
async def complex_multi_step_operation():
    """
    Complex operation with manual session management.
    
    Use this pattern when you need fine-grained control over the transaction.
    """
    from app.services.db import get_db
    
    db = get_db()
    
    session = await start_transaction()
    
    try:
        async with session.start_transaction():
            # Step 1: Create reservation
            reservation_result = await db["reservations"].insert_one(
                {"status": "PENDING", "items": []},
                session=session
            )
            
            # Step 2: Update inventory
            await db["inventory"].update_many(
                {"status": "AVAILABLE"},
                {"$set": {"reserved_by": reservation_result.inserted_id}},
                session=session
            )
            
            # Step 3: Create order
            order_result = await db["orders"].insert_one(
                {"reservation_id": reservation_result.inserted_id},
                session=session
            )
            
            # Transaction commits here
            return order_result.inserted_id
    finally:
        await session.end_session()


# Example 4: Conditional operations in transaction
async def update_order_status_with_notifications(
    order_id: str,
    new_status: str,
    send_email: bool = True
):
    """
    Update order status and create notification atomically.
    
    Demonstrates conditional logic within transactions.
    """
    from app.services.db import get_db
    
    db = get_db()
    orders = db["orders"]
    notifications = db["notifications"]
    
    async with TransactionContext() as session:
        # Update order status
        order = await orders.find_one_and_update(
            {"_id": ObjectId(order_id)},
            {
                "$set": {"status": new_status},
                "$push": {
                    "status_history": {
                        "status": new_status,
                        "timestamp": "now"
                    }
                }
            },
            session=session,
            return_document=True
        )
        
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        # Conditionally create notification
        if send_email:
            await notifications.insert_one(
                {
                    "type": "email",
                    "order_id": order_id,
                    "status": new_status,
                    "recipient": order["customer_email"]
                },
                session=session
            )
        
        return order


# Example 5: Error handling and rollback
async def process_payment_with_rollback(order_id: str, payment_data: dict):
    """
    Process payment with automatic rollback on failure.
    
    Demonstrates error handling in transactions.
    """
    from app.services.db import get_db
    
    db = get_db()
    
    try:
        async with TransactionContext() as session:
            # Update order with payment info
            await db["orders"].update_one(
                {"_id": ObjectId(order_id)},
                {"$set": {"payment": payment_data, "status": "PAID"}},
                session=session
            )
            
            # Create payment record
            payment_result = await db["payments"].insert_one(
                {
                    "order_id": order_id,
                    "amount": payment_data["amount"],
                    "status": "COMPLETED"
                },
                session=session
            )
            
            # Simulate payment provider call
            # If this fails, transaction rolls back automatically
            success = await process_with_payment_provider(payment_data)
            
            if not success:
                raise Exception("Payment provider declined")
            
            return payment_result.inserted_id
            
    except Exception as e:
        # Transaction automatically rolled back
        # Order status and payment record not saved
        print(f"Payment failed, transaction rolled back: {e}")
        raise


async def process_with_payment_provider(payment_data: dict) -> bool:
    """Mock payment provider call."""
    # In real implementation, call external payment API
    return True
