# SMS Notification System - Implementation Complete ✓

**Task 16.1** - Production-ready SMS system with Netgsm and Verimor adapters, fallback support, and comprehensive testing.

## Summary

Implemented a dual-provider SMS system with Netgsm as primary and Verimor as fallback, featuring GSM 03.38/Unicode encoding detection, Turkish character transliteration, İYS compliance, and comprehensive error handling.

## What Was Built

### 1. Netgsm Adapter (`netgsm_adapter.py`)

**Features:**
- GSM 03.38 and Unicode (UCS-2) encoding detection
- Automatic segment count calculation (160/153 for GSM, 70/67 for Unicode)
- Turkish character transliteration (optional)
- E.164 phone number normalization
- Retry logic with exponential backoff
- KVKK-compliant phone number masking

**Key Functions:**
- `_is_gsm0338()` - Detect if text uses GSM 03.38 charset
- `_segment_count()` - Calculate SMS segments and encoding
- `_normalize_msisdn()` - Normalize to E.164 format (+905321234567)
- `send_sms()` - Send SMS with retry logic

**Example:**
```python
adapter = NetgsmAdapter(
    username="api_user",
    password="api_pass",
    header="VORTE",
    transliterate_tr=False,  # Keep Turkish characters
)

result = await adapter.send_sms(
    to=["05321234567", "05329876543"],
    message="Siparişiniz kargoya verildi.",
)
# {
#     "ok": True,
#     "provider": "netgsm",
#     "message_id": "123456789",
#     "encoding": "UCS2",
#     "segments": 1,
#     "recipients": 2,
# }
```

### 2. Verimor Adapter (`verimor_adapter.py`)

**Features:**
- JSON API (v2) integration
- İYS (İleti Yönetim Sistemi) compliance
- Commercial/transactional SMS distinction
- Scheduled SMS support
- Balance and header queries
- Retry logic with exponential backoff

**Key Methods:**
- `send_sms()` - Send SMS with İYS parameters
- `get_balance()` - Query account balance
- `get_headers()` - Get available SMS headers/originators

**Example:**
```python
adapter = VerimorAdapter(
    base_url="https://sms.verimor.com.tr",
    username="api_user",
    password="api_pass",
    source_addr="VORTE",
    default_is_commercial=False,
    default_iys_recipient_type="BIREYSEL",
)

campaign_id = await adapter.send_sms(
    messages=[
        {"dest": "905321234567", "text": "Siparişiniz kargoya verildi."},
    ],
    is_commercial=False,  # Transactional SMS
)
# "987654321"  # Campaign ID
```

### 3. SMS Service (`sms_service.py`)

**Features:**
- Netgsm → Verimor fallback strategy
- Retryable error detection (429, 5xx, timeout, circuit breaker)
- No fallback for client errors (4xx)
- Configurable primary provider
- Comprehensive logging and metrics

**Fallback Triggers:**
- 429 (rate limit)
- 5xx (server errors)
- Timeout/network errors
- Circuit breaker open
- Insufficient credits (Netgsm error code 50)

**Example:**
```python
service = SmsService(
    netgsm=netgsm_adapter,
    verimor=verimor_adapter,
    fallback_enabled=True,
    primary="netgsm",
)

msg = SmsMessage(
    to=["05321234567"],
    text="Siparişiniz kargoya verildi.",
    is_commercial=False,
)

result = await service.send_sms(msg)
# {
#     "provider": "netgsm",
#     "result": {...},
#     "is_fallback": False,
#     "latency_ms": 234,
# }
```

## Architecture

```
app/services/
├── adapters/
│   ├── netgsm_adapter.py      # Netgsm SMS adapter
│   └── verimor_adapter.py     # Verimor SMS adapter
└── sms_service.py             # SMS service with fallback

tests/
├── test_netgsm_adapter.py     # Netgsm adapter tests (19 tests)
├── test_verimor_adapter.py    # Verimor adapter tests (10 tests)
└── test_sms_service.py        # SMS service tests (11 tests)
```

## GSM 03.38 vs Unicode (UCS-2)

### Encoding Detection

**GSM 03.38 (7-bit):**
- Basic Latin characters
- Some special characters (@, £, $, ¥, etc.)
- **160 characters** per SMS (single)
- **153 characters** per SMS (concatenated)

**Unicode (UCS-2):**
- All characters including Turkish (İ, ğ, ş, ç, ö, ü, ı)
- Emojis and special characters
- **70 characters** per SMS (single)
- **67 characters** per SMS (concatenated)

### Turkish Character Transliteration

Optional feature to reduce SMS costs by converting Turkish characters to ASCII:

```python
# Without transliteration (Unicode)
"Çığ ÖĞÜŞ" → UCS2, 8 chars, 1 segment

# With transliteration (GSM)
"Cig OGUS" → GSM, 8 chars, 1 segment (cheaper)
```

**Configuration:**
```python
adapter = NetgsmAdapter(
    username="...",
    password="...",
    header="VORTE",
    transliterate_tr=True,  # Enable transliteration
)
```

## E.164 Phone Number Format

All phone numbers are normalized to E.164 format:

```python
_normalize_msisdn("05321234567")      # → "+905321234567"
_normalize_msisdn("5321234567")       # → "+905321234567"
_normalize_msisdn("+90 532 123 4567") # → "+905321234567"
_normalize_msisdn("0532-123-4567")    # → "+905321234567"
```

## İYS (İleti Yönetim Sistemi) Compliance

### Commercial vs Transactional SMS

**Transactional SMS** (no İYS consent required):
- Order confirmations
- Payment notifications
- Shipping updates
- Password resets

**Commercial SMS** (İYS consent required):
- Marketing campaigns
- Promotional offers
- Newsletters

### İYS Parameters

```python
# Transactional SMS
await service.send_sms(
    SmsMessage(
        to=["905321234567"],
        text="Siparişiniz kargoya verildi.",
        is_commercial=False,  # Transactional
    )
)

# Commercial SMS (requires İYS consent)
await service.send_sms(
    SmsMessage(
        to=["905321234567"],
        text="Yeni kampanyamız başladı!",
        is_commercial=True,  # Commercial
        iys_recipient_type="BIREYSEL",  # or "TACIR"
    )
)
```

**İYS Recipient Types:**
- `BIREYSEL` - Individual consumers
- `TACIR` - Business/merchants

## Fallback Strategy

### Netgsm → Verimor Fallback

**Primary:** Netgsm (cost-effective, simple API)
**Fallback:** Verimor (reliable, feature-rich)

**Fallback Triggers:**
1. **Rate Limit (429)** - Netgsm rate limit exceeded
2. **Server Errors (5xx)** - Netgsm service unavailable
3. **Timeout** - Request timed out
4. **Circuit Breaker** - Too many failures
5. **Insufficient Credits** - Netgsm balance depleted

**No Fallback For:**
- 4xx client errors (invalid credentials, bad parameters)
- Non-retryable errors

### Example Fallback Flow

```
1. Try Netgsm → 503 Service Unavailable (retryable)
2. Trigger fallback to Verimor
3. Verimor succeeds → Return success with is_fallback=True
```

## Testing

### Test Coverage

**40/40 tests passed** ✓

**Netgsm Adapter (19 tests):**
- Encoding detection (GSM 03.38 vs Unicode)
- Segment count calculation
- Turkish transliteration
- Phone normalization (E.164)
- SMS sending (success/error)
- Error code handling
- Scheduled SMS
- Phone masking

**Verimor Adapter (10 tests):**
- SMS sending (success/error)
- İYS parameters (commercial/transactional)
- Multiple recipients
- Scheduled SMS
- Custom tracking ID
- Balance query
- Headers query
- Phone masking

**SMS Service (11 tests):**
- Primary success (no fallback)
- Fallback on retryable errors (429, 5xx, timeout)
- No fallback on non-retryable errors (4xx)
- Both providers fail
- Fallback disabled
- Verimor as primary
- Circuit breaker fallback
- Insufficient credits fallback
- İYS parameters

### Run Tests

```bash
pytest apps/backend/tests/test_netgsm_adapter.py -v
pytest apps/backend/tests/test_verimor_adapter.py -v
pytest apps/backend/tests/test_sms_service.py -v
```

## Configuration

### Environment Variables

```env
# Netgsm Configuration
NETGSM_USERNAME=your_username
NETGSM_PASSWORD=your_password
NETGSM_HEADER=VORTE
NETGSM_ENDPOINT=https://api.netgsm.com.tr/sms/send/get
NETGSM_TRANSLITERATE_TR=false

# Verimor Configuration
VERIMOR_BASE_URL=https://sms.verimor.com.tr
VERIMOR_USERNAME=your_username
VERIMOR_PASSWORD=your_password
VERIMOR_SOURCE_ADDR=VORTE
VERIMOR_IS_COMMERCIAL=false
VERIMOR_IYS_RECIPIENT_TYPE=BIREYSEL

# SMS Service Configuration
SMS_PRIMARY_PROVIDER=netgsm  # or "verimor"
SMS_FALLBACK_ENABLED=true
```

### Initialization

```python
# apps/backend/app/main.py

from app.services.adapters.netgsm_adapter import NetgsmAdapter
from app.services.adapters.verimor_adapter import VerimorAdapter
from app.services.sms_service import SmsService

# Initialize adapters
netgsm = NetgsmAdapter(
    username=settings.NETGSM_USERNAME,
    password=settings.NETGSM_PASSWORD,
    header=settings.NETGSM_HEADER,
    transliterate_tr=settings.NETGSM_TRANSLITERATE_TR,
)

verimor = VerimorAdapter(
    base_url=settings.VERIMOR_BASE_URL,
    username=settings.VERIMOR_USERNAME,
    password=settings.VERIMOR_PASSWORD,
    source_addr=settings.VERIMOR_SOURCE_ADDR,
    default_is_commercial=settings.VERIMOR_IS_COMMERCIAL,
    default_iys_recipient_type=settings.VERIMOR_IYS_RECIPIENT_TYPE,
)

# Initialize SMS service
sms_service = SmsService(
    netgsm=netgsm,
    verimor=verimor,
    fallback_enabled=settings.SMS_FALLBACK_ENABLED,
    primary=settings.SMS_PRIMARY_PROVIDER,
)
```

## KVKK Compliance

### Phone Number Masking

All phone numbers are masked in logs for KVKK compliance:

```python
adapter.mask_phone("+905321234567")  # → "+90532***4567"
```

**Logging Example:**
```python
logger.info(
    "SMS sent",
    extra={
        "to": adapter.mask_phone(phone),  # Masked
        "message_id": "123456789",
    }
)
```

## Metrics & Monitoring

### Prometheus Metrics (Recommended)

```python
# apps/backend/app/services/metrics.py

sms_sent_total = Counter(
    "sms_sent_total",
    "Total SMS sent",
    ["provider", "encoding", "result"],
)

sms_failed_total = Counter(
    "sms_failed_total",
    "Total SMS failures",
    ["provider", "reason"],
)

sms_latency_seconds = Histogram(
    "sms_latency_seconds",
    "SMS send latency",
    ["provider"],
)

sms_segments_total = Counter(
    "sms_segments_total",
    "Total SMS segments sent",
    ["provider", "encoding"],
)

sms_fallback_total = Counter(
    "sms_fallback_total",
    "Total SMS fallbacks",
    ["reason"],
)
```

### Example Queries

**Success Rate:**
```promql
sum(rate(sms_sent_total{result="success"}[5m])) 
/ 
sum(rate(sms_sent_total[5m]))
```

**P95 Latency:**
```promql
histogram_quantile(0.95, 
  sum by (le) (rate(sms_latency_seconds_bucket[5m]))
)
```

**Fallback Rate:**
```promql
sum(rate(sms_fallback_total[5m])) 
/ 
sum(rate(sms_sent_total[5m]))
```

## API Documentation

### Netgsm API

**Endpoint:** `https://api.netgsm.com.tr/sms/send/get`

**Parameters:**
- `usercode` - API username
- `password` - API password
- `gsmno` - Phone numbers (comma-separated)
- `message` - SMS text
- `msgheader` - SMS header/originator
- `startdate` - Schedule time (optional, format: ddMMyyyyHHmmss)

**Response:**
- Success: `00 {message_id}`
- Error: Error code (20, 30, 40, 50, 51, 70, 85)

**Refs:**
- https://www.netgsm.com.tr/dokuman/

### Verimor API

**Endpoint:** `https://sms.verimor.com.tr/v2/send.json`

**Method:** POST (JSON)

**Headers:**
- `Authorization: Basic {base64(username:password)}`

**Body:**
```json
{
  "messages": [
    {"dest": "905321234567", "text": "Message text"}
  ],
  "source_addr": "VORTE",
  "is_commercial": false,
  "iys_recipient_type": "BIREYSEL"
}
```

**Response:**
- Success: Plain text campaign ID
- Error: HTTP error status

**Refs:**
- https://developer.verimor.com.tr/

## Next Steps

### Immediate

1. **Add to NotificationService** (Task 16.2)
   - Integrate SMS service with existing notification system
   - Add `send_payment_notification_sms()` method

2. **Payment Flow Integration** (Task 17)
   - Trigger SMS on payment success
   - Trigger SMS on payment failure

3. **Metrics Integration**
   - Add Prometheus metrics to adapters
   - Create Grafana dashboard

### Future Enhancements

1. **DLR (Delivery Report) Integration**
   - Webhook endpoint for delivery status
   - Update SMS status in database

2. **SMS Templates**
   - Template system similar to email templates
   - Variable substitution
   - Multi-language support

3. **Rate Limiting**
   - Per-user rate limits
   - Global rate limits
   - Queue-based sending

4. **Bulk SMS**
   - Batch sending optimization
   - Progress tracking
   - Scheduled campaigns

## References

- [GSM 03.38 Character Set](https://en.wikipedia.org/wiki/GSM_03.38)
- [E.164 Phone Number Format](https://en.wikipedia.org/wiki/E.164)
- [Netgsm Documentation](https://www.netgsm.com.tr/dokuman/)
- [Verimor API Documentation](https://developer.verimor.com.tr/)
- [İYS (İleti Yönetim Sistemi)](https://www.iys.org.tr/)
- [KVKK (Kişisel Verilerin Korunması Kanunu)](https://www.kvkk.gov.tr/)

---

**Status**: ✅ Complete
**Tests**: 40/40 passed
**Date**: 2025-01-25
