# apps/backend/app/notifications/sms_renderer.py
"""
SMS template renderer with Jinja2.

Simple text-based templates for SMS notifications.
Supports variable substitution and multi-language (TR/EN).

Refs:
- https://jinja.palletsprojects.com/
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, Any

from jinja2 import Environment, FileSystemLoader, select_autoescape


logger = logging.getLogger(__name__)


# Template directory
TEMPLATES_DIR = Path(__file__).parent / "templates"

# Jinja2 environment for SMS templates
env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape([]),  # No auto-escape for plain text
    trim_blocks=True,
    lstrip_blocks=True,
)


def render_sms(
    template_name: str,
    locale: str,
    context: Dict[str, Any],
) -> str:
    """
    Render SMS template to plain text.
    
    Args:
        template_name: Template name (e.g., "payment_authorized")
        locale: Language code ("tr" or "en")
        context: Template context variables
    
    Returns:
        Rendered SMS text
    
    Example:
        >>> text = render_sms(
        ...     "payment_authorized",
        ...     "tr",
        ...     {"order_id": "ORD-12345", "amount": "250,00 TL", "brand_name": "Vorte"}
        ... )
        >>> print(text)
        "Ödemeniz onaylandı. Sipariş: ORD-12345. Tutar: 250,00 TL. Vorte"
    """
    try:
        # Load template
        template_path = f"{locale}/sms/{template_name}.txt"
        template = env.get_template(template_path)
        
        # Render
        text = template.render(**context)
        
        # Strip whitespace
        text = text.strip()
        
        logger.debug(
            f"Rendered SMS template",
            extra={
                "template": template_name,
                "locale": locale,
                "length": len(text),
            }
        )
        
        return text
    
    except Exception as exc:
        logger.error(
            f"Failed to render SMS template",
            extra={
                "template": template_name,
                "locale": locale,
                "error": str(exc),
            },
            exc_info=True,
        )
        raise


def get_available_sms_templates(locale: str) -> list[str]:
    """
    Get list of available SMS templates for a locale.
    
    Args:
        locale: Language code ("tr" or "en")
    
    Returns:
        List of template names (without .txt extension)
    """
    templates_path = TEMPLATES_DIR / locale / "sms"
    
    if not templates_path.exists():
        return []
    
    templates = []
    for file in templates_path.glob("*.txt"):
        template_name = file.stem  # Remove .txt
        templates.append(template_name)
    
    return sorted(templates)
