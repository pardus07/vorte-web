# Email System Production Checklist

Production-ready email notification system deployment checklist with compliance requirements for Gmail/Yahoo bulk sender guidelines.

## References

- [RFC 2369 - List-Unsubscribe](https://www.rfc-editor.org/rfc/rfc2369.html)
- [RFC 8058 - One-Click Unsubscribe](https://datatracker.ietf.org/doc/html/rfc8058)
- [Google Bulk Sender Guidelines](https://support.google.com/mail/answer/81126)
- [SendGrid EU Region](https://docs.sendgrid.com/ui/account-and-settings/regional-services)
- [AWS SES v2 API](https://docs.aws.amazon.com/ses/latest/dg/send-email-api-v2.html)

---

## 1. Template Security & HTML Compatibility ✓

### Jinja2 Auto-Escape

**Status**: ✅ Implemented

```python
# apps/backend/app/notifications/renderer.py
env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),  # ✓ Auto-escape enabled
    bytecode_cache=bytecode_cache,
    trim_blocks=True,
    lstrip_blocks=True,
)
```

**Reference**: [Jinja2 Security](https://jinja.palletsprojects.com/en/3.1.x/api/#autoescaping)

### CSS Inlining

**Status**: ✅ Implemented

```python
# Premailer transforms CSS to inline styles
html_inlined = transform(html_raw, strip_important=False)
```

**Reference**: [Premailer Documentation](https://github.com/peterbe/premailer)

---

## 2. MIME Format (Multipart/Alternative) ✓

### SendGrid Implementation

**Status**: ✅ Implemented

```python
# apps/backend/app/services/adapters/sendgrid_adapter.py
mail = Mail(
    from_email=self.from_email,
    to_emails=to_email,
    subject=subject,
    html_content=html_content,
    plain_text_content=plain_text_content,  # ✓ Both HTML and text
)
```

SendGrid automatically creates `multipart/alternative` when both HTML and text are provided.

### SES Implementation

**Status**: ✅ Implemented

```python
# apps/backend/app/services/adapters/ses_adapter.py
message = {
    "Subject": {"Data": subject, "Charset": "UTF-8"},
    "Body": {
        "Html": {"Data": html_content, "Charset": "UTF-8"},
        "Text": {"Data": plain_text_content, "Charset": "UTF-8"},
    },
}
```

SES v2 automatically creates `multipart/alternative` structure.

**Reference**: [Email MIME Best Practices](https://www.aplos.com/help/email-mime-types)

---

## 3. SendGrid Configuration (Primary Provider)

### EU Endpoint

**Status**: ✅ Implemented

```python
# apps/backend/app/services/adapters/sendgrid_adapter.py
def __init__(
    self,
    api_key: str,
    from_email: str,
    from_name: str = "Vorte",
    region: str = "eu",  # ✓ EU region
):
    if region == "eu":
        self.base_url = "https://api.eu.sendgrid.com"  # ✓ EU endpoint
    else:
        self.base_url = "https://api.sendgrid.com"
```

**Reference**: [SendGrid Regional Services](https://docs.sendgrid.com/ui/account-and-settings/regional-services)

### ASM (Unsubscribe Groups)

**Status**: ✅ Implemented

```python
# Marketing emails only
await notification_service.send_templated_email(
    template="newsletter",
    locale="tr",
    to="customer@example.com",
    context={...},
    category="marketing",
    asm_group_id=12345,  # ✓ SendGrid ASM group
)
```

**Action Required**: Create ASM groups in SendGrid dashboard:
1. Login to SendGrid → Settings → Unsubscribe Groups
2. Create groups: "Transactional", "Marketing", "Newsletters"
3. Note group IDs for configuration

**Reference**: [SendGrid ASM Documentation](https://docs.sendgrid.com/ui/sending-email/unsubscribe-groups)

---

## 4. AWS SES Configuration (Fallback Provider)

### EU Region

**Status**: ✅ Implemented

```python
# apps/backend/app/services/adapters/ses_adapter.py
self.client = boto3.client(
    "sesv2",
    region_name="eu-central-1",  # ✓ EU region
    aws_access_key_id=aws_access_key_id,
    aws_secret_access_key=aws_secret_access_key,
)
```

**Action Required**: Verify domain in SES:
```bash
# 1. Add domain to SES
aws sesv2 create-email-identity --email-identity example.com --region eu-central-1

# 2. Get verification tokens
aws sesv2 get-email-identity --email-identity example.com --region eu-central-1

# 3. Add DNS records (DKIM, verification)
```

**Reference**: [SES v2 SendEmail API](https://docs.aws.amazon.com/ses/latest/dg/send-email-api-v2.html)

---

## 5. Unsubscribe Headers (Gmail/Yahoo Compliance) ⚠️

### List-Unsubscribe Header (RFC 2369)

**Status**: ⚠️ **ACTION REQUIRED**

**Implementation Needed**:

```python
# apps/backend/app/services/adapters/sendgrid_adapter.py
# Add to send_email method

headers = {
    "List-Unsubscribe": f"<mailto:unsubscribe@example.com?subject=unsubscribe>, <https://example.com/unsubscribe?token={token}>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",  # RFC 8058
}

mail = Mail(
    from_email=self.from_email,
    to_emails=to_email,
    subject=subject,
    html_content=html_content,
    plain_text_content=plain_text_content,
)

# Add headers
for key, value in headers.items():
    mail.add_header(key, value)
```

**For SES**:

```python
# apps/backend/app/services/adapters/ses_adapter.py
# Add to send_email method

response = self.client.send_email(
    FromEmailAddress=self.from_email,
    Destination={"ToAddresses": [to_email]},
    Content={
        "Simple": {
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {
                "Html": {"Data": html_content, "Charset": "UTF-8"},
                "Text": {"Data": plain_text_content, "Charset": "UTF-8"},
            },
            "Headers": [
                {
                    "Name": "List-Unsubscribe",
                    "Value": f"<mailto:unsubscribe@example.com?subject=unsubscribe>, <https://example.com/unsubscribe?token={token}>",
                },
                {
                    "Name": "List-Unsubscribe-Post",
                    "Value": "List-Unsubscribe=One-Click",
                },
            ],
        }
    },
)
```

**Unsubscribe Endpoint Required**:

```python
# apps/backend/app/api/v1/unsubscribe.py
from fastapi import APIRouter, Query

router = APIRouter()

@router.post("/unsubscribe")
async def one_click_unsubscribe(
    token: str = Query(...),
):
    """
    One-click unsubscribe endpoint (RFC 8058).
    
    Must return 200 OK immediately.
    """
    # Decode token and unsubscribe user
    # ...
    
    return {"status": "unsubscribed"}

@router.get("/unsubscribe")
async def unsubscribe_page(token: str = Query(...)):
    """
    Unsubscribe confirmation page.
    """
    # Show unsubscribe confirmation page
    # ...
    
    return {"message": "You have been unsubscribed"}
```

**References**:
- [RFC 2369 - List-Unsubscribe](https://www.rfc-editor.org/rfc/rfc2369.html)
- [RFC 8058 - One-Click Unsubscribe](https://datatracker.ietf.org/doc/html/rfc8058)
- [Google Bulk Sender Requirements](https://support.google.com/mail/answer/81126)

---

## 6. Authentication & Deliverability ⚠️

### SPF Record

**Status**: ⚠️ **ACTION REQUIRED**

Add SPF record to DNS:

```dns
# For SendGrid
example.com. IN TXT "v=spf1 include:sendgrid.net ~all"

# For SendGrid + SES
example.com. IN TXT "v=spf1 include:sendgrid.net include:amazonses.com ~all"
```

**Verification**:
```bash
dig TXT example.com +short | grep spf
```

### DKIM Records

**Status**: ⚠️ **ACTION REQUIRED**

**SendGrid DKIM**:
1. Login to SendGrid → Settings → Sender Authentication
2. Authenticate your domain
3. Add provided CNAME records to DNS:

```dns
s1._domainkey.example.com. IN CNAME s1.domainkey.u12345.wl.sendgrid.net.
s2._domainkey.example.com. IN CNAME s2.domainkey.u12345.wl.sendgrid.net.
```

**SES DKIM**:
```bash
# Get DKIM tokens
aws sesv2 get-email-identity --email-identity example.com --region eu-central-1

# Add CNAME records
{token1}._domainkey.example.com. IN CNAME {token1}.dkim.amazonses.com.
{token2}._domainkey.example.com. IN CNAME {token2}.dkim.amazonses.com.
{token3}._domainkey.example.com. IN CNAME {token3}.dkim.amazonses.com.
```

**Verification**:
```bash
dig CNAME s1._domainkey.example.com +short
```

### DMARC Policy

**Status**: ⚠️ **ACTION REQUIRED**

Add DMARC record to DNS:

```dns
_dmarc.example.com. IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com; ruf=mailto:dmarc@example.com; fo=1; adkim=r; aspf=r; pct=100; ri=86400"
```

**Policy Explanation**:
- `p=quarantine`: Quarantine emails that fail DMARC (start with `p=none` for monitoring)
- `rua=mailto:dmarc@example.com`: Aggregate reports
- `ruf=mailto:dmarc@example.com`: Forensic reports
- `adkim=r`: Relaxed DKIM alignment
- `aspf=r`: Relaxed SPF alignment
- `pct=100`: Apply policy to 100% of emails

**Verification**:
```bash
dig TXT _dmarc.example.com +short
```

**References**:
- [DMARC.org](https://dmarc.org/)
- [Google DMARC Guide](https://support.google.com/a/answer/2466580)

---

## 7. Gmail/Yahoo Bulk Sender Requirements

### Requirements Checklist

**For senders of 5,000+ emails/day to Gmail/Yahoo**:

- [ ] **SPF**: Configured and aligned
- [ ] **DKIM**: Configured and aligned
- [ ] **DMARC**: Policy set (minimum `p=none`)
- [ ] **Valid Forward/Reverse DNS**: PTR records match
- [ ] **TLS**: Encrypted connection (handled by SendGrid/SES)
- [ ] **List-Unsubscribe**: RFC 2369 header
- [ ] **One-Click Unsubscribe**: RFC 8058 header + endpoint
- [ ] **Spam Rate**: < 0.3% (monitor via Google Postmaster Tools)
- [ ] **From Address**: Matches domain in DKIM signature

### Google Postmaster Tools

**Action Required**: Register domain at [Google Postmaster Tools](https://postmaster.google.com/)

1. Add domain
2. Verify ownership (DNS TXT record)
3. Monitor:
   - Spam rate
   - IP reputation
   - Domain reputation
   - Delivery errors

### Yahoo Complaint Feedback Loop

**Action Required**: Register at [Yahoo Complaint Feedback Loop](https://senders.yahooinc.com/complaint-feedback-loop/)

**Reference**: [Google Bulk Sender Guidelines](https://support.google.com/mail/answer/81126)

---

## 8. Metrics & Observability ✓

### SendGrid Metrics

**Status**: ✅ Implemented (via adapter retry logic)

**Additional Monitoring Needed**:

```python
# apps/backend/app/services/metrics.py
# Add email-specific metrics

email_sent_total = Counter(
    "email_sent_total",
    "Total emails sent",
    ["provider", "template", "locale", "result"],
)

email_delivery_latency = Histogram(
    "email_delivery_latency_seconds",
    "Email delivery latency",
    ["provider", "template"],
)

email_bounce_total = Counter(
    "email_bounce_total",
    "Total email bounces",
    ["provider", "bounce_type"],
)

email_complaint_total = Counter(
    "email_complaint_total",
    "Total spam complaints",
    ["provider"],
)
```

### SES CloudWatch Metrics

**Action Required**: Enable SES CloudWatch metrics:

```bash
aws sesv2 put-configuration-set-event-destination \
  --configuration-set-name production \
  --event-destination-name cloudwatch \
  --event-destination '{
    "Enabled": true,
    "CloudWatchDestination": {
      "DimensionConfigurations": [
        {
          "DimensionName": "ses:configuration-set",
          "DimensionValueSource": "MESSAGE_TAG",
          "DefaultDimensionValue": "production"
        }
      ]
    }
  }'
```

**Monitor**:
- `Send` - Emails sent
- `Delivery` - Successful deliveries
- `Bounce` - Hard/soft bounces
- `Complaint` - Spam complaints
- `Reject` - Rejected emails

**Reference**: [SES CloudWatch Metrics](https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity.html)

---

## 9. Content & Localization ✓

### Subject Extraction

**Status**: ✅ Implemented

```python
# Templates define subject
{% set subject = "Sipariş Onayı • " ~ order.id %}

# Renderer extracts subject
template_module = html_tpl.make_module(context)
subject = getattr(template_module, "subject", None)
```

### TR/EN Templates

**Status**: ✅ Implemented

- `templates/tr/` - Turkish templates
- `templates/en/` - English templates
- Both generate HTML + plain text

### Transactional vs Marketing

**Status**: ✅ Implemented

```python
# Transactional (no ASM group)
await notification_service.send_templated_email(
    template="order_confirmation",
    category="transactional",
)

# Marketing (with ASM group)
await notification_service.send_templated_email(
    template="newsletter",
    category="marketing",
    asm_group_id=12345,  # ✓ Unsubscribe group
)
```

---

## 10. Integration with Payment Flow ⚠️

### Trigger Points

**Status**: ⚠️ **ACTION REQUIRED**

**Implementation Needed**:

```python
# apps/backend/app/services/payment_orchestrator.py

async def process_webhook(self, webhook_data: dict) -> dict:
    """Process payment webhook."""
    # ... existing webhook processing ...
    
    # After successful payment authorization
    if new_status == PaymentStatus.AUTHORIZED:
        # Update order status
        await self.order_repo.update_status(
            order_id=payment.order_id,
            status=OrderStatus.PAID,
        )
        
        # ✓ Send order confirmation email
        await self._send_order_confirmation_email(payment, order)
    
    # After payment failure
    elif new_status == PaymentStatus.FAILED:
        # ✓ Send payment failed email
        await self._send_payment_failed_email(payment, order)
    
    return {"status": "processed"}

async def _send_order_confirmation_email(
    self,
    payment: Payment,
    order: Order,
) -> None:
    """Send order confirmation email."""
    try:
        await self.notification_service.send_templated_email(
            template="order_confirmation",
            locale=order.customer.locale or "tr",
            to=order.customer.email,
            context={
                "order": {
                    "id": order.id,
                    "order_items": [
                        {
                            "name": item.name,
                            "quantity": item.quantity,
                            "price_formatted": format_currency(
                                item.price, order.currency
                            ),
                        }
                        for item in order.items
                    ],
                    "total_formatted": format_currency(
                        order.total, order.currency
                    ),
                    "tracking_url": f"https://example.com/orders/{order.id}",
                },
                "customer": {
                    "first_name": order.customer.first_name,
                    "address": order.shipping_address,
                },
                "brand_name": "Vorte",
                "current_year": datetime.now().year,
            },
            category="order",
            custom_args={
                "order_id": order.id,
                "payment_id": payment.id,
            },
        )
    except Exception as exc:
        logger.error(
            f"Failed to send order confirmation email",
            extra={
                "order_id": order.id,
                "payment_id": payment.id,
                "error": str(exc),
            },
        )
        # Don't fail webhook processing if email fails

async def _send_payment_failed_email(
    self,
    payment: Payment,
    order: Order,
) -> None:
    """Send payment failed email."""
    try:
        await self.notification_service.send_templated_email(
            template="payment_failed",
            locale=order.customer.locale or "tr",
            to=order.customer.email,
            context={
                "payment": {
                    "id": payment.id,
                    "amount_formatted": format_currency(
                        payment.amount, payment.currency
                    ),
                    "created_at": payment.created_at.strftime("%Y-%m-%d %H:%M"),
                    "error_message": payment.error_message,
                },
                "order": {"id": order.id},
                "customer": {"first_name": order.customer.first_name},
                "retry_url": f"https://example.com/orders/{order.id}/retry",
                "support_url": "https://example.com/support",
                "brand_name": "Vorte",
            },
            category="payment",
            custom_args={
                "order_id": order.id,
                "payment_id": payment.id,
            },
        )
    except Exception as exc:
        logger.error(
            f"Failed to send payment failed email",
            extra={
                "order_id": order.id,
                "payment_id": payment.id,
                "error": str(exc),
            },
        )
```

### Refund Notification

```python
# apps/backend/app/services/refund_service.py

async def initiate_refund(self, payment_id: str, amount: Decimal) -> Refund:
    """Initiate refund."""
    # ... existing refund logic ...
    
    # ✓ Send refund confirmation email
    await self._send_refund_email(refund, payment, order)
    
    return refund

async def _send_refund_email(
    self,
    refund: Refund,
    payment: Payment,
    order: Order,
) -> None:
    """Send refund confirmation email."""
    try:
        await self.notification_service.send_templated_email(
            template="refund_issued",
            locale=order.customer.locale or "tr",
            to=order.customer.email,
            context={
                "refund": {
                    "id": refund.id,
                    "amount_formatted": format_currency(
                        refund.amount, refund.currency
                    ),
                    "created_at": refund.created_at.strftime("%Y-%m-%d %H:%M"),
                    "reason": refund.reason,
                },
                "payment": {
                    "id": payment.id,
                    "amount_formatted": format_currency(
                        payment.amount, payment.currency
                    ),
                },
                "order": {
                    "id": order.id,
                    "tracking_url": f"https://example.com/orders/{order.id}",
                },
                "customer": {"first_name": order.customer.first_name},
                "brand_name": "Vorte",
            },
            category="refund",
            custom_args={
                "order_id": order.id,
                "payment_id": payment.id,
                "refund_id": refund.id,
            },
        )
    except Exception as exc:
        logger.error(
            f"Failed to send refund email",
            extra={
                "refund_id": refund.id,
                "payment_id": payment.id,
                "error": str(exc),
            },
        )
```

---

## 11. Accessibility & Best Practices

### Inline Styles

**Status**: ✅ Implemented (via premailer)

### Semantic HTML

**Action Required**: Add ARIA labels and semantic markup:

```html
<!-- In templates -->
<a href="{{ order.tracking_url }}" 
   class="btn" 
   role="button"
   aria-label="Siparişi görüntüle">
  Siparişi Görüntüle
</a>

<table role="presentation" aria-label="Sipariş detayları">
  <!-- ... -->
</table>
```

**Reference**: [Email Accessibility](https://www.litmus.com/blog/ultimate-guide-accessible-emails/)

---

## Pre-Launch Validation

### DNS Records Checklist

```bash
# 1. SPF
dig TXT example.com +short | grep spf

# 2. DKIM (SendGrid)
dig CNAME s1._domainkey.example.com +short

# 3. DKIM (SES)
dig CNAME {token}._domainkey.example.com +short

# 4. DMARC
dig TXT _dmarc.example.com +short

# 5. MX Records
dig MX example.com +short
```

### Test Email Checklist

- [ ] Send test email to Gmail
- [ ] Send test email to Yahoo
- [ ] Send test email to Outlook
- [ ] Check spam folder
- [ ] Verify unsubscribe link works
- [ ] Verify one-click unsubscribe works
- [ ] Check email rendering in multiple clients
- [ ] Verify SPF/DKIM/DMARC pass (check email headers)

### Tools

- [Mail Tester](https://www.mail-tester.com/) - Email deliverability score
- [MXToolbox](https://mxtoolbox.com/) - DNS/SPF/DKIM/DMARC checker
- [Litmus](https://www.litmus.com/) - Email rendering tests
- [Email on Acid](https://www.emailonacid.com/) - Email testing

---

## Summary

### ✅ Completed

- [x] Jinja2 auto-escape
- [x] CSS inlining (premailer)
- [x] Multipart/alternative (HTML + text)
- [x] SendGrid EU endpoint
- [x] SES EU region
- [x] Template system (TR/EN)
- [x] SendGrid → SES fallback
- [x] Subject extraction
- [x] ASM group support

### ⚠️ Action Required

- [ ] **DNS Records**: SPF, DKIM, DMARC
- [ ] **List-Unsubscribe Headers**: RFC 2369 + RFC 8058
- [ ] **One-Click Unsubscribe Endpoint**: `/api/v1/unsubscribe`
- [ ] **SendGrid ASM Groups**: Create in dashboard
- [ ] **SES Domain Verification**: Verify in AWS
- [ ] **Google Postmaster Tools**: Register domain
- [ ] **Payment Flow Integration**: Add email triggers
- [ ] **Monitoring**: CloudWatch + Prometheus metrics
- [ ] **Test Emails**: Send to Gmail/Yahoo/Outlook

### Priority Order

1. **DNS Records** (SPF, DKIM, DMARC) - Required for deliverability
2. **List-Unsubscribe Headers** - Required for Gmail/Yahoo compliance
3. **One-Click Unsubscribe Endpoint** - Required for Gmail/Yahoo compliance
4. **Payment Flow Integration** - Required for functionality
5. **Monitoring** - Required for observability
6. **Test Emails** - Required for validation

---

**Estimated Time**: 4-6 hours for full production deployment
