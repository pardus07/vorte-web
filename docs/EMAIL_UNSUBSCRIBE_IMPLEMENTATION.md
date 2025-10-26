# List-Unsubscribe Implementation Guide

Quick implementation guide for RFC 2369 (List-Unsubscribe) and RFC 8058 (One-Click Unsubscribe) compliance.

## Overview

Gmail and Yahoo require List-Unsubscribe headers for bulk senders (5,000+ emails/day). This guide shows how to implement both the headers and the required endpoint.

## References

- [RFC 2369 - List-Unsubscribe](https://www.rfc-editor.org/rfc/rfc2369.html)
- [RFC 8058 - One-Click Unsubscribe](https://datatracker.ietf.org/doc/html/rfc8058)
- [Google Bulk Sender Guidelines](https://support.google.com/mail/answer/81126)

---

## 1. Update SendGrid Adapter

Add List-Unsubscribe headers to SendGrid emails:

```python
# apps/backend/app/services/adapters/sendgrid_adapter.py

async def send_email(
    self,
    to_email: str,
    subject: str,
    html_content: str,
    plain_text_content: str | None = None,
    category: str | None = None,
    custom_args: dict | None = None,
    reply_to: str | None = None,
    asm_group_id: int | None = None,
) -> dict:
    """Send email via SendGrid with List-Unsubscribe headers."""
    
    # Generate unsubscribe token
    unsubscribe_token = self._generate_unsubscribe_token(
        to_email, category, asm_group_id
    )
    
    # Build email
    mail = Mail(
        from_email=Email(self.from_email, self.from_name),
        to_emails=to_email,
        subject=subject,
        html_content=html_content,
        plain_text_content=plain_text_content,
    )
    
    # Add List-Unsubscribe headers (RFC 2369 + RFC 8058)
    unsubscribe_url = f"{self.base_app_url}/api/v1/unsubscribe?token={unsubscribe_token}"
    unsubscribe_mailto = f"mailto:unsubscribe@{self.domain}?subject=unsubscribe"
    
    mail.add_header(
        "List-Unsubscribe",
        f"<{unsubscribe_mailto}>, <{unsubscribe_url}>"
    )
    mail.add_header(
        "List-Unsubscribe-Post",
        "List-Unsubscribe=One-Click"
    )
    
    # Add category
    if category:
        mail.category = Category(category)
    
    # Add custom args
    if custom_args:
        for key, value in custom_args.items():
            mail.custom_arg = CustomArg(key, str(value))
    
    # Add reply-to
    if reply_to:
        mail.reply_to = Email(reply_to)
    
    # Add ASM group (SendGrid unsubscribe)
    if asm_group_id:
        mail.asm = Asm(group_id=asm_group_id)
    
    # Send with retry
    return await self._send_with_retry(mail)

def _generate_unsubscribe_token(
    self,
    email: str,
    category: str | None,
    asm_group_id: int | None,
) -> str:
    """
    Generate secure unsubscribe token.
    
    Token format: base64(email:category:asm_group_id:timestamp:signature)
    """
    import hmac
    import hashlib
    import base64
    import time
    
    timestamp = int(time.time())
    payload = f"{email}:{category}:{asm_group_id}:{timestamp}"
    
    # Sign with secret key
    signature = hmac.new(
        self.secret_key.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    
    # Encode token
    token_data = f"{payload}:{signature}"
    token = base64.urlsafe_b64encode(token_data.encode()).decode()
    
    return token
```

**Configuration**:

```python
# apps/backend/app/config.py

class Settings(BaseSettings):
    # ... existing settings ...
    
    # Unsubscribe configuration
    BASE_APP_URL: str = "https://example.com"
    UNSUBSCRIBE_SECRET_KEY: str  # Generate with: openssl rand -hex 32
    DOMAIN: str = "example.com"
```

---

## 2. Update SES Adapter

Add List-Unsubscribe headers to SES emails:

```python
# apps/backend/app/services/adapters/ses_adapter.py

async def send_email(
    self,
    to_email: str,
    subject: str,
    html_content: str,
    plain_text_content: str | None = None,
    category: str | None = None,
    custom_args: dict | None = None,
    reply_to: str | None = None,
    tags: dict[str, str] | None = None,
) -> dict:
    """Send email via SES with List-Unsubscribe headers."""
    
    # Generate unsubscribe token
    unsubscribe_token = self._generate_unsubscribe_token(
        to_email, category
    )
    
    # Build unsubscribe URLs
    unsubscribe_url = f"{self.base_app_url}/api/v1/unsubscribe?token={unsubscribe_token}"
    unsubscribe_mailto = f"mailto:unsubscribe@{self.domain}?subject=unsubscribe"
    
    # Build message
    message = {
        "Subject": {"Data": subject, "Charset": "UTF-8"},
        "Body": {},
        "Headers": [
            {
                "Name": "List-Unsubscribe",
                "Value": f"<{unsubscribe_mailto}>, <{unsubscribe_url}>",
            },
            {
                "Name": "List-Unsubscribe-Post",
                "Value": "List-Unsubscribe=One-Click",
            },
        ],
    }
    
    # Add HTML content
    if html_content:
        message["Body"]["Html"] = {"Data": html_content, "Charset": "UTF-8"}
    
    # Add plain text content
    if plain_text_content:
        message["Body"]["Text"] = {"Data": plain_text_content, "Charset": "UTF-8"}
    
    # Build email tags
    email_tags = []
    if category:
        email_tags.append({"Name": "category", "Value": category})
    if tags:
        for key, value in tags.items():
            email_tags.append({"Name": key, "Value": value})
    
    # Send email
    try:
        response = await asyncio.to_thread(
            self.client.send_email,
            FromEmailAddress=self.from_email,
            Destination={"ToAddresses": [to_email]},
            Content={"Simple": message},
            EmailTags=email_tags if email_tags else None,
            ReplyToAddresses=[reply_to] if reply_to else None,
            ConfigurationSetName=self.configuration_set,
        )
        
        return {
            "message_id": response["MessageId"],
            "provider": "ses",
        }
    
    except Exception as exc:
        logger.error(
            f"SES send failed",
            extra={"error": str(exc), "to": self.mask_email(to_email)},
        )
        raise

def _generate_unsubscribe_token(
    self,
    email: str,
    category: str | None,
) -> str:
    """Generate secure unsubscribe token (same as SendGrid)."""
    import hmac
    import hashlib
    import base64
    import time
    
    timestamp = int(time.time())
    payload = f"{email}:{category}:{timestamp}"
    
    signature = hmac.new(
        self.secret_key.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    
    token_data = f"{payload}:{signature}"
    token = base64.urlsafe_b64encode(token_data.encode()).decode()
    
    return token
```

---

## 3. Create Unsubscribe Endpoint

Create one-click unsubscribe endpoint (RFC 8058):

```python
# apps/backend/app/api/v1/unsubscribe.py
"""
One-click unsubscribe endpoint (RFC 8058).

Refs:
- https://datatracker.ietf.org/doc/html/rfc8058
- https://support.google.com/mail/answer/81126
"""
from fastapi import APIRouter, Query, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
import hmac
import hashlib
import base64
import time
import logging

from app.config import get_settings
from app.repositories.user_repository import UserRepository
from app.repositories.subscription_repository import SubscriptionRepository


router = APIRouter(prefix="/api/v1", tags=["unsubscribe"])
logger = logging.getLogger(__name__)
settings = get_settings()


@router.post("/unsubscribe")
async def one_click_unsubscribe(
    request: Request,
    token: str = Query(..., description="Unsubscribe token"),
):
    """
    One-click unsubscribe endpoint (RFC 8058).
    
    Must return 200 OK immediately without user interaction.
    
    Gmail/Yahoo will POST to this endpoint when user clicks
    "Unsubscribe" in email client.
    """
    try:
        # Decode and verify token
        email, category, asm_group_id, timestamp = _verify_token(token)
        
        # Check token age (max 30 days)
        if time.time() - timestamp > 30 * 24 * 60 * 60:
            raise HTTPException(status_code=400, detail="Token expired")
        
        # Unsubscribe user
        user_repo = UserRepository()
        subscription_repo = SubscriptionRepository()
        
        user = await user_repo.find_by_email(email)
        if not user:
            # User not found - still return 200 OK
            logger.warning(f"Unsubscribe: user not found", extra={"email": email})
            return {"status": "ok"}
        
        # Unsubscribe from category
        if category:
            await subscription_repo.unsubscribe(
                user_id=user.id,
                category=category,
            )
            logger.info(
                f"User unsubscribed via one-click",
                extra={
                    "user_id": user.id,
                    "email": email,
                    "category": category,
                },
            )
        else:
            # Unsubscribe from all
            await subscription_repo.unsubscribe_all(user_id=user.id)
            logger.info(
                f"User unsubscribed from all via one-click",
                extra={"user_id": user.id, "email": email},
            )
        
        # Return 200 OK immediately (required by RFC 8058)
        return {"status": "ok"}
    
    except Exception as exc:
        logger.error(
            f"One-click unsubscribe failed",
            extra={"error": str(exc), "token": token},
        )
        # Still return 200 OK to avoid retry loops
        return {"status": "error"}


@router.get("/unsubscribe", response_class=HTMLResponse)
async def unsubscribe_page(
    token: str = Query(..., description="Unsubscribe token"),
):
    """
    Unsubscribe confirmation page (for mailto: links).
    
    Shows confirmation page with unsubscribe button.
    """
    try:
        # Decode and verify token
        email, category, asm_group_id, timestamp = _verify_token(token)
        
        # Check token age
        if time.time() - timestamp > 30 * 24 * 60 * 60:
            return """
            <html>
                <body>
                    <h1>Link Expired</h1>
                    <p>This unsubscribe link has expired.</p>
                </body>
            </html>
            """
        
        # Show confirmation page
        category_text = category or "all emails"
        
        return f"""
        <html>
            <head>
                <title>Unsubscribe</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        max-width: 600px;
                        margin: 50px auto;
                        padding: 20px;
                    }}
                    .btn {{
                        display: inline-block;
                        padding: 12px 24px;
                        background-color: #111827;
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        border: none;
                        cursor: pointer;
                        font-size: 16px;
                    }}
                    .btn:hover {{
                        background-color: #1f2937;
                    }}
                </style>
            </head>
            <body>
                <h1>Unsubscribe</h1>
                <p>Are you sure you want to unsubscribe from <strong>{category_text}</strong>?</p>
                <p>Email: <strong>{email}</strong></p>
                
                <form method="post" action="/api/v1/unsubscribe?token={token}">
                    <button type="submit" class="btn">Unsubscribe</button>
                </form>
                
                <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
                    You can manage your email preferences in your account settings.
                </p>
            </body>
        </html>
        """
    
    except Exception as exc:
        logger.error(
            f"Unsubscribe page failed",
            extra={"error": str(exc), "token": token},
        )
        return """
        <html>
            <body>
                <h1>Error</h1>
                <p>Invalid unsubscribe link.</p>
            </body>
        </html>
        """


def _verify_token(token: str) -> tuple[str, str | None, int | None, int]:
    """
    Verify and decode unsubscribe token.
    
    Returns:
        (email, category, asm_group_id, timestamp)
    
    Raises:
        HTTPException: If token is invalid
    """
    try:
        # Decode token
        token_data = base64.urlsafe_b64decode(token.encode()).decode()
        parts = token_data.split(":")
        
        if len(parts) < 4:
            raise ValueError("Invalid token format")
        
        email = parts[0]
        category = parts[1] if parts[1] != "None" else None
        asm_group_id = int(parts[2]) if parts[2] != "None" else None
        timestamp = int(parts[3])
        signature = parts[4]
        
        # Verify signature
        payload = f"{email}:{category}:{asm_group_id}:{timestamp}"
        expected_signature = hmac.new(
            settings.UNSUBSCRIBE_SECRET_KEY.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_signature):
            raise ValueError("Invalid signature")
        
        return email, category, asm_group_id, timestamp
    
    except Exception as exc:
        logger.error(f"Token verification failed", extra={"error": str(exc)})
        raise HTTPException(status_code=400, detail="Invalid token")
```

---

## 4. Create Subscription Repository

Manage user email subscriptions:

```python
# apps/backend/app/repositories/subscription_repository.py
"""
User email subscription management.
"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime


class SubscriptionRepository:
    """Manage user email subscriptions."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.email_subscriptions
    
    async def unsubscribe(
        self,
        user_id: str,
        category: str,
    ) -> None:
        """
        Unsubscribe user from email category.
        
        Args:
            user_id: User ID
            category: Email category (e.g., "marketing", "newsletter")
        """
        await self.collection.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    f"categories.{category}.subscribed": False,
                    f"categories.{category}.unsubscribed_at": datetime.utcnow(),
                },
                "$setOnInsert": {
                    "user_id": user_id,
                    "created_at": datetime.utcnow(),
                },
            },
            upsert=True,
        )
    
    async def unsubscribe_all(self, user_id: str) -> None:
        """
        Unsubscribe user from all email categories.
        
        Args:
            user_id: User ID
        """
        await self.collection.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "unsubscribed_all": True,
                    "unsubscribed_all_at": datetime.utcnow(),
                },
                "$setOnInsert": {
                    "user_id": user_id,
                    "created_at": datetime.utcnow(),
                },
            },
            upsert=True,
        )
    
    async def is_subscribed(
        self,
        user_id: str,
        category: str,
    ) -> bool:
        """
        Check if user is subscribed to email category.
        
        Args:
            user_id: User ID
            category: Email category
        
        Returns:
            True if subscribed, False otherwise
        """
        subscription = await self.collection.find_one({"user_id": user_id})
        
        if not subscription:
            return True  # Default: subscribed
        
        # Check if unsubscribed from all
        if subscription.get("unsubscribed_all"):
            return False
        
        # Check category subscription
        category_sub = subscription.get("categories", {}).get(category, {})
        return category_sub.get("subscribed", True)  # Default: subscribed
```

**MongoDB Schema**:

```javascript
// email_subscriptions collection
{
  "_id": ObjectId("..."),
  "user_id": "user_123",
  "unsubscribed_all": false,
  "unsubscribed_all_at": null,
  "categories": {
    "marketing": {
      "subscribed": false,
      "unsubscribed_at": ISODate("2025-01-15T10:30:00Z")
    },
    "newsletter": {
      "subscribed": true,
      "unsubscribed_at": null
    }
  },
  "created_at": ISODate("2025-01-01T00:00:00Z"),
  "updated_at": ISODate("2025-01-15T10:30:00Z")
}
```

**Indexes**:

```javascript
db.email_subscriptions.createIndex({ "user_id": 1 }, { unique: true });
```

---

## 5. Update NotificationService

Check subscription status before sending:

```python
# apps/backend/app/services/notification_service.py

async def send_templated_email(
    self,
    *,
    template: str,
    locale: str,
    to: str,
    subject: str | None = None,
    context: dict,
    category: str = "transactional",
    custom_args: dict | None = None,
    reply_to: str | None = None,
    asm_group_id: int | None = None,
    user_id: str | None = None,  # ✓ Add user_id parameter
) -> dict:
    """Send templated email with subscription check."""
    
    # Check subscription status (skip for transactional emails)
    if category != "transactional" and user_id:
        subscription_repo = SubscriptionRepository(self.db)
        is_subscribed = await subscription_repo.is_subscribed(
            user_id=user_id,
            category=category,
        )
        
        if not is_subscribed:
            logger.info(
                f"Skipping email: user unsubscribed",
                extra={
                    "user_id": user_id,
                    "category": category,
                    "template": template,
                },
            )
            return {
                "status": "skipped",
                "reason": "user_unsubscribed",
            }
    
    # Render template
    from app.notifications.renderer import render_email
    payload = render_email(template, locale, context)
    
    # Use subject from parameter, template, or context
    subject_final = subject or payload.get("subject") or context.get("subject") or "[Notification]"
    
    # Create email message
    msg = EmailMessage(
        to=to,
        subject=subject_final,
        html=payload["html"],
        text=payload["text"],
        category=category,
        custom_args=custom_args,
        reply_to=reply_to,
        asm_group_id=asm_group_id,
        template=template,
    )
    
    # Send via primary provider with fallback
    return await self.send_email(msg)
```

---

## 6. Register Endpoint

Add unsubscribe endpoint to main app:

```python
# apps/backend/app/main.py

from app.api.v1 import unsubscribe

app = FastAPI(title="Vorte API")

# Register routers
app.include_router(unsubscribe.router)
```

---

## 7. Testing

### Test One-Click Unsubscribe

```bash
# Generate test token
python -c "
import hmac
import hashlib
import base64
import time

email = 'test@example.com'
category = 'marketing'
asm_group_id = None
timestamp = int(time.time())
secret_key = 'your-secret-key'

payload = f'{email}:{category}:{asm_group_id}:{timestamp}'
signature = hmac.new(secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
token_data = f'{payload}:{signature}'
token = base64.urlsafe_b64encode(token_data.encode()).decode()

print(f'Token: {token}')
print(f'URL: http://localhost:8000/api/v1/unsubscribe?token={token}')
"

# Test POST (one-click)
curl -X POST "http://localhost:8000/api/v1/unsubscribe?token=YOUR_TOKEN"

# Test GET (confirmation page)
curl "http://localhost:8000/api/v1/unsubscribe?token=YOUR_TOKEN"
```

### Test Email Headers

Send test email and check headers:

```python
# Test script
import asyncio
from app.services.notification_service import NotificationService

async def test():
    service = NotificationService(...)
    
    result = await service.send_templated_email(
        template="order_confirmation",
        locale="tr",
        to="test@example.com",
        context={...},
        category="order",
        user_id="user_123",
    )
    
    print(result)

asyncio.run(test())
```

Check email headers in Gmail:
1. Open email
2. Click "Show original"
3. Verify headers:
   - `List-Unsubscribe: <mailto:...>, <https://...>`
   - `List-Unsubscribe-Post: List-Unsubscribe=One-Click`

---

## Summary

### Implementation Checklist

- [ ] Update SendGrid adapter with List-Unsubscribe headers
- [ ] Update SES adapter with List-Unsubscribe headers
- [ ] Create unsubscribe endpoint (`/api/v1/unsubscribe`)
- [ ] Create subscription repository
- [ ] Update NotificationService with subscription check
- [ ] Register endpoint in main app
- [ ] Test one-click unsubscribe
- [ ] Test email headers
- [ ] Deploy to production

### Configuration Required

```env
# .env
BASE_APP_URL=https://example.com
UNSUBSCRIBE_SECRET_KEY=your-secret-key-here  # Generate with: openssl rand -hex 32
DOMAIN=example.com
```

### Estimated Time

- Implementation: 2-3 hours
- Testing: 1 hour
- Total: 3-4 hours

---

**Status**: Ready for implementation
**Priority**: High (required for Gmail/Yahoo compliance)
