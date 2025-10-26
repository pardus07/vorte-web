# apps/backend/app/services/adapters/ses_adapter.py
"""
AWS SES v2 Email Adapter with EU Region Support.

Implements AWS SES v2 (sesv2:SendEmail) with:
- EU region support (eu-central-1, eu-west-1) for GDPR compliance
- Configuration Set support for event tracking
- Standard retry mode with exponential backoff
- Prometheus metrics for observability
- HTML and plain text email support

Refs:
- https://docs.aws.amazon.com/ses/latest/dg/send-email-api-v2.html
- https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sesv2.html
- https://docs.aws.amazon.com/general/latest/gr/ses.html (EU endpoints)
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, UTC

try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError, BotoCoreError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    boto3 = None
    Config = None
    ClientError = Exception
    BotoCoreError = Exception

from app.services.metrics import PROVIDER_LATENCY_SECONDS


logger = logging.getLogger(__name__)


class SESAdapter:
    """
    AWS SES v2 email adapter with EU region support.
    
    Features:
    - SES v2 API (sesv2:SendEmail)
    - EU region support for GDPR compliance
    - Configuration Set for event tracking
    - Standard retry mode (exponential backoff)
    - Prometheus metrics
    - HTML + plain text support
    - Email tags for tracking
    
    Quotas (SES):
    - Sandbox: 200 emails/day, 1 email/second
    - Production: Request quota increase (varies by region)
    
    Ref: https://docs.aws.amazon.com/ses/latest/dg/quotas.html
    """

    def __init__(
        self,
        region_name: str = "eu-central-1",
        from_email: str = "noreply@vorte.com.tr",
        configuration_set: Optional[str] = None,
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
        aws_session_token: Optional[str] = None,
    ) -> None:
        """
        Initialize SES adapter.
        
        Args:
            region_name: AWS region (eu-central-1, eu-west-1, etc.)
            from_email: Default sender email (must be verified in SES)
            configuration_set: SES Configuration Set name for event tracking
            aws_access_key_id: AWS access key (optional, uses env/IAM role)
            aws_secret_access_key: AWS secret key (optional)
            aws_session_token: AWS session token (optional, for temporary credentials)
        
        Raises:
            ImportError: If boto3 is not installed
        """
        if not BOTO3_AVAILABLE:
            raise ImportError(
                "boto3 is required for SES adapter. "
                "Install with: pip install boto3"
            )
        
        self.region_name = region_name
        self.from_email = from_email
        self.configuration_set = configuration_set
        
        # Configure boto3 client with retry settings
        # Standard retry mode: exponential backoff with jitter
        # Ref: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/retries.html
        config = Config(
            region_name=region_name,
            retries={
                "mode": "standard",  # Exponential backoff
                "max_attempts": 4,   # 3 retries + 1 initial attempt
            },
            read_timeout=30,
            connect_timeout=10,
        )
        
        # Create SES v2 client
        self.client = boto3.client(
            "sesv2",
            config=config,
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            aws_session_token=aws_session_token,
        )
        
        logger.info(f"SES adapter initialized (region: {region_name})")

    async def send_email(
        self,
        *,
        to_email: str,
        to_name: Optional[str] = None,
        subject: str,
        html_content: Optional[str] = None,
        plain_text_content: Optional[str] = None,
        reply_to: Optional[str] = None,
        category: Optional[str] = None,
        custom_args: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Send email via AWS SES v2 API.
        
        Args:
            to_email: Recipient email address
            to_name: Recipient name (optional, not used in SES)
            subject: Email subject
            html_content: HTML email body
            plain_text_content: Plain text email body
            reply_to: Reply-to email address
            category: Email category for tracking (added as tag)
            custom_args: Custom arguments for tracking (added as tags)
        
        Returns:
            Response dict with status and message_id
        
        Raises:
            ClientError: If SES API call fails
            ValueError: If neither html_content nor plain_text_content provided
        
        Ref: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sesv2/client/send_email.html
        """
        if not html_content and not plain_text_content:
            raise ValueError("Either html_content or plain_text_content must be provided")
        
        # Build email content
        content = {"Simple": {"Subject": {"Data": subject}}}
        
        if html_content and plain_text_content:
            # Both HTML and plain text
            content["Simple"]["Body"] = {
                "Html": {"Data": html_content},
                "Text": {"Data": plain_text_content},
            }
        elif html_content:
            # HTML only
            content["Simple"]["Body"] = {
                "Html": {"Data": html_content},
            }
        else:
            # Plain text only
            content["Simple"]["Body"] = {
                "Text": {"Data": plain_text_content},
            }
        
        # Build request parameters
        params = {
            "FromEmailAddress": self.from_email,
            "Destination": {
                "ToAddresses": [to_email],
            },
            "Content": content,
        }
        
        # Add reply-to
        if reply_to:
            params["ReplyToAddresses"] = [reply_to]
        
        # Add configuration set
        if self.configuration_set:
            params["ConfigurationSetName"] = self.configuration_set
        
        # Add email tags for tracking
        email_tags = []
        if category:
            email_tags.append({"Name": "category", "Value": category})
        if custom_args:
            for key, value in custom_args.items():
                email_tags.append({"Name": key, "Value": str(value)})
        
        if email_tags:
            params["EmailTags"] = email_tags
        
        # Send email with metrics
        try:
            with PROVIDER_LATENCY_SECONDS.labels(provider="ses", method="send_email").time():
                response = self.client.send_email(**params)
            
            message_id = response["MessageId"]
            
            logger.info(
                f"Email sent successfully via SES",
                extra={
                    "to": self.mask_email(to_email),
                    "subject": subject,
                    "message_id": message_id,
                    "region": self.region_name,
                }
            )
            
            return {
                "status": "sent",
                "provider": "ses",
                "message_id": message_id,
                "timestamp": datetime.now(UTC).isoformat(),
            }
        
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_message = e.response.get("Error", {}).get("Message", str(e))
            
            logger.error(
                f"SES client error: {error_code}",
                extra={
                    "error_code": error_code,
                    "error_message": error_message,
                    "to": self.mask_email(to_email),
                }
            )
            
            # Map SES errors to user-friendly messages
            if error_code == "MessageRejected":
                raise ValueError(f"Email rejected by SES: {error_message}")
            elif error_code == "MailFromDomainNotVerifiedException":
                raise ValueError(f"Sender domain not verified in SES: {error_message}")
            elif error_code == "ConfigurationSetDoesNotExistException":
                raise ValueError(f"SES configuration set not found: {error_message}")
            elif error_code == "AccountSendingPausedException":
                raise ValueError("SES account sending is paused")
            elif error_code == "TooManyRequestsException":
                # Throttling - boto3 retry should handle this
                raise
            else:
                raise
        
        except BotoCoreError as e:
            logger.error(
                f"SES botocore error: {e}",
                extra={"to": self.mask_email(to_email)}
            )
            raise
        
        except Exception as e:
            logger.error(
                f"SES unexpected error: {e}",
                extra={"to": self.mask_email(to_email)}
            )
            raise

    def mask_email(self, email: str) -> str:
        """
        Mask email for logging (PII protection).
        
        Example: test@example.com -> te**@ex**.com
        """
        if "@" not in email:
            return "***"
        
        local, domain = email.split("@", 1)
        
        # Mask local part
        if len(local) == 1:
            masked_local = "*"
        elif len(local) == 2:
            masked_local = "**"
        else:
            masked_local = local[:2] + "**"
        
        # Mask domain
        if "." in domain:
            domain_parts = domain.split(".")
            masked_domain = domain_parts[0][:2] + "**" + "." + domain_parts[-1]
        else:
            masked_domain = domain[:2] + "**"
        
        return f"{masked_local}@{masked_domain}"
