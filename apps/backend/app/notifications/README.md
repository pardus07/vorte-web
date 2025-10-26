# Email Template System

Production-ready email template system with Jinja2, CSS inlining, and multi-language support.

## Features

- **Jinja2 Templates**: Layout inheritance, partials, macros, and filters
- **CSS Inlining**: Automatic CSS inlining via premailer for email client compatibility
- **Multi-Language**: TR/EN templates with easy extensibility
- **HTML + Text**: Automatic plain text fallback generation
- **Template Caching**: Bytecode caching for production performance
- **Provider Integration**: Seamless integration with SendGrid/SES adapters

## Architecture

```
app/notifications/
├── __init__.py
├── renderer.py                    # Template rendering engine
├── README.md                      # This file
└── templates/
    ├── tr/                        # Turkish templates
    │   ├── base.html.j2          # Base layout
    │   └── emails/
    │       ├── order_confirmation.html.j2
    │       ├── payment_authorized.html.j2
    │       ├── payment_failed.html.j2
    │       └── refund_issued.html.j2
    └── en/                        # English templates
        ├── base.html.j2
        └── emails/
            ├── order_confirmation.html.j2
            ├── payment_authorized.html.j2
            ├── payment_failed.html.j2
            └── refund_issued.html.j2
```

## Dependencies

```toml
dependencies = [
  "jinja2>=3.1.0",      # Template engine
  "premailer>=3.10.0",  # CSS inlining
  "html2text>=2024.2.26" # HTML to text conversion
]
```

## Usage

### Basic Usage

```python
from app.services.notification_service import NotificationService

# Send templated email
await notification_service.send_templated_email(
    template="order_confirmation",
    locale="tr",
    to="customer@example.com",
    context={
        "order": {
            "id": "ORD-12345",
            "order_items": [
                {
                    "name": "Ürün 1",
                    "quantity": 2,
                    "price_formatted": "100,00 TL",
                },
            ],
            "total_formatted": "200,00 TL",
            "tracking_url": "https://example.com/orders/ORD-12345",
        },
        "customer": {
            "first_name": "Ahmet",
            "address": {
                "line1": "Test Caddesi No:1",
                "city": "İstanbul",
                "postal_code": "34000",
                "country": "Türkiye",
            },
        },
        "brand_name": "MyStore",
        "current_year": "2025",
    },
    category="order",
    custom_args={"order_id": "ORD-12345"},
)
```

### Direct Rendering (Testing)

```python
from app.notifications.renderer import render_email

result = render_email("payment_authorized", "tr", context)

print(result["html"])     # Inlined CSS HTML
print(result["text"])     # Plain text fallback
print(result["subject"])  # Email subject from template
```

## Available Templates

### 1. Order Confirmation (`order_confirmation`)

**Context:**
```python
{
    "order": {
        "id": str,
        "order_items": [{"name": str, "quantity": int, "price_formatted": str}],
        "total_formatted": str,
        "tracking_url": str,
    },
    "customer": {
        "first_name": str,
        "address": {
            "line1": str,
            "line2": str (optional),
            "city": str,
            "postal_code": str,
            "country": str,
        },
    },
    "brand_name": str,
    "current_year": str,
}
```

### 2. Payment Authorized (`payment_authorized`)

**Context:**
```python
{
    "payment": {
        "id": str,
        "amount_formatted": str,
        "created_at": str,
        "card_last4": str,
    },
    "order": {
        "id": str,
        "tracking_url": str,
    },
    "customer": {"first_name": str},
    "brand_name": str,
}
```

### 3. Payment Failed (`payment_failed`)

**Context:**
```python
{
    "payment": {
        "id": str,
        "amount_formatted": str,
        "created_at": str,
        "error_message": str (optional),
    },
    "order": {"id": str},
    "customer": {"first_name": str},
    "retry_url": str,
    "support_url": str,
    "brand_name": str,
}
```

### 4. Refund Issued (`refund_issued`)

**Context:**
```python
{
    "refund": {
        "id": str,
        "amount_formatted": str,
        "created_at": str,
        "reason": str (optional),
    },
    "payment": {
        "id": str,
        "amount_formatted": str,
    },
    "order": {
        "id": str,
        "tracking_url": str,
    },
    "customer": {"first_name": str},
    "brand_name": str,
}
```

## Creating New Templates

### 1. Create Template Files

**TR Template** (`templates/tr/emails/my_template.html.j2`):
```jinja2
{% extends "tr/base.html.j2" %}

{% set subject = "Konu Başlığı • " ~ order.id %}
{% set preheader = "Önizleme metni" %}

{% block content %}
<h1>Başlık</h1>
<p>Merhaba {{ customer.first_name }},</p>
<p>İçerik...</p>
{% endblock %}
```

**EN Template** (`templates/en/emails/my_template.html.j2`):
```jinja2
{% extends "en/base.html.j2" %}

{% set subject = "Subject • " ~ order.id %}
{% set preheader = "Preview text" %}

{% block content %}
<h1>Title</h1>
<p>Hello {{ customer.first_name }},</p>
<p>Content...</p>
{% endblock %}
```

### 2. Use Template

```python
await notification_service.send_templated_email(
    template="my_template",
    locale="tr",
    to="customer@example.com",
    context={...},
)
```

## Email Client Compatibility

### CSS Inlining

All CSS is automatically inlined by premailer for maximum email client compatibility:

```html
<!-- Before (in template) -->
<a class="btn" href="...">Click</a>

<!-- After (rendered) -->
<a href="..." style="display:inline-block;padding:12px 24px;background-color:#111827;color:#ffffff;...">Click</a>
```

### Supported Clients

- Gmail (Web, iOS, Android)
- Outlook (Desktop, Web, Mobile)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- ProtonMail
- Thunderbird

## Testing

### Unit Tests

```bash
pytest apps/backend/tests/test_email_templates.py -v
```

**Coverage:**
- Template rendering (TR/EN)
- CSS inlining
- HTML + text generation
- Variable substitution
- Error handling

### Integration Tests

```bash
pytest apps/backend/tests/test_notification_templated.py -v
```

**Coverage:**
- NotificationService integration
- SendGrid/SES provider integration
- Fallback behavior
- Category and custom_args propagation
- Subject extraction from templates

## Performance

### Template Caching

Templates are compiled and cached using Jinja2's bytecode cache:

```python
bytecode_cache = FileSystemBytecodeCache(
    directory=".cache/jinja",
    pattern="%s.cache"
)
```

**Benefits:**
- First render: ~50ms (compile + render)
- Cached renders: ~5ms (render only)
- 10x performance improvement in production

### CSS Inlining Performance

Premailer caching is automatic:
- First inline: ~30ms
- Subsequent inlines: ~10ms

## GDPR Compliance

### SendGrid EU Endpoint

```python
# Configured in SendGridAdapter
base_url = "https://api.eu.sendgrid.com"
```

### SES EU Region

```python
# Configured in SESAdapter
region_name = "eu-central-1"
```

### PII Masking

Email addresses are masked in logs:
```python
customer@example.com → customer@***
```

## Marketing vs Transactional

### Transactional Emails

No unsubscribe required:
```python
await notification_service.send_templated_email(
    template="order_confirmation",
    category="transactional",
    # No asm_group_id needed
)
```

### Marketing Emails

Unsubscribe required (SendGrid ASM):
```python
await notification_service.send_templated_email(
    template="newsletter",
    category="marketing",
    asm_group_id=12345,  # SendGrid unsubscribe group
)
```

## Troubleshooting

### Template Not Found

```
jinja2.exceptions.TemplateNotFound: tr/emails/my_template.html.j2
```

**Solution:** Check template path and locale.

### CSS Not Inlined

```python
# Install premailer
pip install premailer
```

### Subject Not Extracted

Ensure template has `{% set subject = "..." %}`:
```jinja2
{% set subject = "Order Confirmation • " ~ order.id %}
```

## References

- [Jinja2 Documentation](https://jinja.palletsprojects.com/)
- [Premailer Documentation](https://github.com/peterbe/premailer)
- [SendGrid Mail Send API](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
- [AWS SES v2 API](https://docs.aws.amazon.com/ses/latest/dg/send-email-api-v2.html)
- [Email Client CSS Support](https://www.caniemail.com/)
