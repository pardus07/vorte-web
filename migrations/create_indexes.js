// MongoDB index creation script for payment collections
// Run with: docker exec vorte-mongo mongosh vorte /tmp/create_indexes.js

print("Creating indexes for payments collection...");

// OrderId index for fast order lookup
db.payments.createIndex({ orderId: 1 }, { name: "ix_payments_orderId" });
print("✅ Created ix_payments_orderId");

// Idempotency key (unique, sparse)
db.payments.createIndex(
  { idempotencyKey: 1 },
  { name: "uq_idempotencyKey", unique: true, sparse: true }
);
print("✅ Created uq_idempotencyKey");

// Status + createdAt for reconciliation worker
db.payments.createIndex(
  { status: 1, createdAt: 1 },
  { name: "ix_payments_status_createdAt" }
);
print("✅ Created ix_payments_status_createdAt");

// Provider references (sparse + unique)
db.payments.createIndex(
  { "providerRefs.iyz_paymentId": 1 },
  { name: "uq_iyz_paymentId", unique: true, sparse: true }
);
print("✅ Created uq_iyz_paymentId");

db.payments.createIndex(
  { "providerRefs.paytr_merchant_oid": 1 },
  { name: "uq_paytr_merchant_oid", unique: true, sparse: true }
);
print("✅ Created uq_paytr_merchant_oid");

print("\nCreating indexes for payment_events collection...");

// Event deduplication (provider + externalEventId)
db.payment_events.createIndex(
  { provider: 1, externalEventId: 1 },
  { name: "uq_provider_eventId", unique: true }
);
print("✅ Created uq_provider_eventId");

// PaymentId lookup for events
db.payment_events.createIndex(
  { paymentId: 1, createdAt: -1 },
  { name: "ix_events_paymentId_createdAt" }
);
print("✅ Created ix_events_paymentId_createdAt");

print("\n✅ All indexes created successfully!");

// List all indexes
print("\n📋 Payments indexes:");
db.payments.getIndexes().forEach(function(idx) {
  print("  - " + idx.name);
});

print("\n📋 Payment events indexes:");
db.payment_events.getIndexes().forEach(function(idx) {
  print("  - " + idx.name);
});
