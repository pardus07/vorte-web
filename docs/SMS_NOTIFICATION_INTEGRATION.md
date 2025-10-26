# SMS Notification Integration - Complete ✓

**Task 16.2** - SMS integration with NotificationService, template system, and comprehensive testing.

## Summary

Integrated SMS functionality into NotificationService with Netgsm → Verimor fallback, Jinja2-based SMS templates, İYS compliance support, and comprehensive error handling.

## What Was Built

### 1. NotificationService SMS Integration

**New Methods:**
- `send_sms_notification()` - Send raw SMS
- `send_sms_templated()` - Send templated SMS with Jinja2

**Features:**
- Optional SMS service (graceful degradation if not configured)
- İYS compliance parameters (is_commercial, iys_recipient_type)
- Scheduled SMS support
- Custom tracking IDs
- Comprehensive logging and error handling

**Example:**
```python
# Initialize with SMS service
notification_service = NotificationService(
    sendgrid=sendgrid_adapter,
    ses=ses_adapter,
    sms_service=sms_service,  # Optional
    fallback_enabled=True,
)

# Send raw SMS
await notification_service.send_sms_notification(
    to=["05321234567"],
    text="Siparişiniz kargoya verildi.",
    is_commercial=False,
)

# Send templated SMS
await notification_service.send_sms_templated(
    template="payment_authorized",
    locale="tr",
    to=["05321234567"],
    context={
        "order_id": "ORD-12345",
        "amount": "250,00 TL",
        "brand_name": "Vorte",
    },
    is_commercial=False,
)
```

### 2. SMS Template System

**SMS Renderer** (`sms_renderer.py`):
- Jinja2-based plain text templates
- Multi-language support (TR/EN)
- Variable substitution
- Template discovery

**Templates Created:**
- `order_confirmation.txt` (TR/EN)
- `payment_authorized.txt` (TR/EN)
- `payment_failed.txt` (TR/EN)
- `refund_issued.txt` (TR/EN)

**Template Structure:**
```
app/notifications/templates/
├── tr/
│   └── sms/
│       ├── order_confirmation.txt
│       ├── payment_authorized.txt
│       ├── payment_failed.txt
│       └── refund_issued.txt
└── en/
    └── sms/
        ├── order_confirmation.txt
        ├── payment_authorized.txt
        ├── payment_failed.txt
        └── refund_issued.txt
```

**Example Template** (`tr/sms/payment_authorized.txt`):
```
Ödemeniz onaylandı. Sipariş: {{ order_id }}. Tutar: {{ amount }}. {{ brand_name }}
```

### 3. Comprehensive Testing

**12/12 tests passed** ✓

**Test Coverage:**
- SMS notification sending (success/failure)
- İYS compliance parameters
- Scheduled SMS
- SMS service not configured (graceful error)
- Templated SMS (all templates, TR/EN)
- Template fallback to context
- Error handling

## Architecture

```
app/
├── services/
│   ├── notification_service.py    # Email + SMS unified service
│   ├── sms_service.py             # SMS service with fallback
│   └── adapters/
│       ├── netgsm_adapter.py      # Netgsm SMS adapter
│       └── verimor_adapter.py     # Verimor SMS adapter
└── notifications/
    ├── sms_renderer.py            # SMS template renderer
    └── templates/
        ├── tr/sms/                # Turkish SMS templates
        └── en/sms/                # English SMS templates

tests/
├── test_notification_sms.py       # NotificationService SMS tests (12 tests)
├── test_sms_service.py            # SMS service tests (11 tests)
├── test_netgsm_adapter.py         # Netgsm adapter tests (19 tests)
└── test_verimor_adapter.py        # Verimor adapter tests (10 tests)
```

## Usage Examples

### 1. Payment Authorized SMS

```python
await notification_service.send_sms_templated(
    template="payment_authorized",
    locale="tr",
    to=["05321234567"],
    context={
        "order_id": "ORD-12345",
        "amount": "250,00 TL",
        "brand_name": "Vorte",
    },
    is_commercial=False,  # Transactional
)
```

**Rendered SMS:**
```
Ödemeniz onaylandı. Sipariş: ORD-12345. Tutar: 250,00 TL. Vorte
```

### 2. Payment Failed SMS

```python
await notification_service.send_sms_templated(
    template="payment_failed",
    locale="en",
    to=["05321234567"],
    context={
        "order_id": "ORD-12345",
        "brand_name": "Vorte",
    },
    is_commercial=False,
)
```

**Rendered SMS:**
```
Payment failed. Order: ORD-12345. Please try again. Vorte
```

### 3. Order Confirmation SMS

```python
await notification_service.send_sms_templated(
    template="order_confirmation",
    locale="tr",
    to=["05321234567"],
    context={
        "order_id": "ORD-12345",
        "amount": "250,00 TL",
        "brand_name": "Vorte",
    },
)
```

**Rendered SMS:**
```
Siparişiniz alındı. Sipariş No: ORD-12345. Tutar: 250,00 TL. Teşekkürler! Vorte
```

### 4. Refund Issued SMS

```python
await notification_service.send_sms_templated(
    template="refund_issued",
    locale="tr",
    to=["05321234567"],
    context={
        "order_id": "ORD-12345",
        "amount": "250,00 TL",
        "brand_name": "Vorte",
    },
)
```

**Rendered SMS:**
```
İade işleminiz başlatıldı. Sipariş: ORD-12345. Tutar: 250,00 TL. 5-10 iş günü içinde hesabınıza yansıyacaktır. Vorte
```

## İYS Compliance

### Transactional SMS (No İYS Consent Required)

```python
await notification_service.send_sms_templated(
    template="payment_authorized",
    locale="tr",
    to=["05321234567"],
    context={...},
    is_commercial=False,  # Transactional
)
```

### Commercial SMS (İYS Consent Required)

```python
await notification_service.send_sms_templated(
    template="campaign",
    locale="tr",
    to=["05321234567"],
    context={...},
    is_commercial=True,  # Commercial
    iys_recipient_type="BIREYSEL",  # or "TACIR"
)
```

## Integration with Payment Flow

### PaymentOrchestrator Integration

```python
# apps/backend/app/services/payment_orchestrator.py

async def process_webhook(self, webhook_data: dict) -> dict:
    """Process payment webhook."""
    # ... existing webhook processing ...
    
    # After successful payment authorization
    if new_status == PaymentStatus.AUTHORIZED:
        # Send email
        await self.notification_service.send_templated_email(
            template="order_confirmation",
            locale=order.customer.locale or "tr",
            to=order.customer.email,
            context={...},
        )
        
        # Send SMS
        if order.customer.phone:
            try:
                await self.notification_service.send_sms_templated(
                    template="payment_authorized",
                    locale=order.customer.locale or "tr",
                    to=[order.customer.phone],
                    context={
                        "order_id": order.id,
                        "amount": format_currency(payment.amount, payment.currency),
                        "brand_name": "Vorte",
                    },
                    is_commercial=False,
                )
            except Exception as exc:
                logger.error(
                    f"Failed to send payment authorized SMS",
                    extra={"order_id": order.id, "error": str(exc)}
                )
                # Don't fail webhook processing if SMS fails
    
    # After payment failure
    elif new_status == PaymentStatus.FAILED:
        # Send email
        await self.notification_service.send_templated_email(
            template="payment_failed",
            locale=order.customer.locale or "tr",
            to=order.customer.email,
            context={...},
        )
        
        # Send SMS
        if order.customer.phone:
            try:
                await self.notification_service.send_sms_templated(
                    template="payment_failed",
                    locale=order.customer.locale or "tr",
                    to=[order.customer.phone],
                    context={
                        "order_id": order.id,
                        "brand_name": "Vorte",
                    },
                    is_commercial=False,
                )
            except Exception as exc:
                logger.error(
                    f"Failed to send payment failed SMS",
                    extra={"order_id": order.id, "error": str(exc)}
                )
    
    return {"status": "processed"}
```

## Configuration

### Environment Variables

```env
# Netgsm Configuration
NETGSM_USERNAME=your_username
NETGSM_PASSWORD=your_password
NETGSM_HEADER=VORTE

# Verimor Configuration
VERIMOR_BASE_URL=https://sms.verimor.com.tr
VERIMOR_USERNAME=your_username
VERIMOR_PASSWORD=your_password
VERIMOR_SOURCE_ADDR=VORTE

# SMS Service Configuration
SMS_PRIMARY_PROVIDER=netgsm
SMS_FALLBACK_ENABLED=true
```

### Initialization

```python
# apps/backend/app/main.py

from app.services.adapters.netgsm_adapter import NetgsmAdapter
from app.services.adapters.verimor_adapter import VerimorAdapter
from app.services.sms_service import SmsService
from app.services.notification_service import NotificationService

# Initialize SMS adapters
netgsm = NetgsmAdapter(
    username=settings.NETGSM_USERNAME,
    password=settings.NETGSM_PASSWORD,
    header=settings.NETGSM_HEADER,
)

verimor = VerimorAdapter(
    base_url=settings.VERIMOR_BASE_URL,
    username=settings.VERIMOR_USERNAME,
    password=settings.VERIMOR_PASSWORD,
    source_addr=settings.VERIMOR_SOURCE_ADDR,
)

# Initialize SMS service
sms_service = SmsService(
    netgsm=netgsm,
    verimor=verimor,
    fallback_enabled=settings.SMS_FALLBACK_ENABLED,
    primary=settings.SMS_PRIMARY_PROVIDER,
)

# Initialize notification service (email + SMS)
notification_service = NotificationService(
    sendgrid=sendgrid_adapter,
    ses=ses_adapter,
    sms_service=sms_service,  # Optional
    fallback_enabled=True,
)
```

## Template Management

### Adding New SMS Templates

1. **Create Template Files:**

```bash
# Turkish template
echo "Yeni mesaj: {{ message }}" > apps/backend/app/notifications/templates/tr/sms/new_template.txt

# English template
echo "New message: {{ message }}" > apps/backend/app/notifications/templates/en/sms/new_template.txt
```

2. **Use Template:**

```python
await notification_service.send_sms_templated(
    template="new_template",
    locale="tr",
    to=["05321234567"],
    context={"message": "Test message"},
)
```

### Template Best Practices

1. **Keep SMS Short** - SMS has character limits (160 GSM, 70 Unicode)
2. **Include Brand Name** - Always end with brand name
3. **Use Clear Language** - Avoid jargon
4. **Include Order/Transaction ID** - For reference
5. **Test Both Languages** - Ensure TR/EN templates are consistent

## Error Handling

### Graceful Degradation

```python
# SMS service not configured - no error
notification_service = NotificationService(
    sendgrid=sendgrid_adapter,
    ses=ses_adapter,
    sms_service=None,  # SMS disabled
)

# Calling SMS methods will raise RuntimeError
try:
    await notification_service.send_sms_notification(...)
except RuntimeError as exc:
    logger.warning(f"SMS not configured: {exc}")
```

### Template Not Found

```python
# Falls back to context["message"] or context["text"]
await notification_service.send_sms_templated(
    template="nonexistent",
    locale="tr",
    to=["05321234567"],
    context={"message": "Fallback message"},  # Used if template not found
)
```

## Testing

### Run Tests

```bash
# All SMS tests
pytest apps/backend/tests/test_notification_sms.py -v

# All notification tests (email + SMS)
pytest apps/backend/tests/test_notification*.py -v

# Full SMS system tests
pytest apps/backend/tests/test_*sms*.py apps/backend/tests/test_netgsm*.py apps/backend/tests/test_verimor*.py -v
```

### Test Results

```
test_notification_sms.py ............                    [100%]

12 passed in 0.54s
```

## Metrics & Monitoring

### Recommended Prometheus Metrics

```python
# apps/backend/app/services/metrics.py

sms_sent_total = Counter(
    "sms_sent_total",
    "Total SMS sent via NotificationService",
    ["provider", "template", "locale"],
)

sms_failed_total = Counter(
    "sms_failed_total",
    "Total SMS failures",
    ["reason", "template"],
)

sms_latency_seconds = Histogram(
    "sms_latency_seconds",
    "SMS send latency",
    ["provider", "template"],
)
```

### Example Queries

**SMS Success Rate:**
```promql
sum(rate(sms_sent_total[5m])) 
/ 
(sum(rate(sms_sent_total[5m])) + sum(rate(sms_failed_total[5m])))
```

**SMS by Template:**
```promql
sum by (template) (rate(sms_sent_total[5m]))
```

## Next Steps

### Immediate

1. **Add to PaymentOrchestrator** (Task 17)
   - Trigger SMS on AUTHORIZED
   - Trigger SMS on FAILED
   - Trigger SMS on REFUNDED

2. **Add Metrics**
   - Integrate Prometheus metrics
   - Create Grafana dashboard

### Future Enhancements

1. **DLR (Delivery Report) Integration**
   - Webhook endpoint for delivery status
   - Update SMS status in database

2. **SMS Templates with Jinja2 Features**
   - Conditional content
   - Loops for multiple items
   - Filters for formatting

3. **SMS Rate Limiting**
   - Per-user rate limits
   - Global rate limits

4. **SMS Queue**
   - Async SMS sending via queue
   - Retry logic
   - Priority handling

## References

- [Netgsm Documentation](https://www.netgsm.com.tr/dokuman/)
- [Verimor API Documentation](https://developer.verimor.com.tr/)
- [İYS (İleti Yönetim Sistemi)](https://www.iys.org.tr/)
- [Jinja2 Documentation](https://jinja.palletsprojects.com/)
- [GSM 03.38 Character Set](https://en.wikipedia.org/wiki/GSM_03.38)

---

**Status**: ✅ Complete
**Tests**: 12/12 passed
**Date**: 2025-01-25
