# apps/backend/app/notifications/renderer.py
"""
Email template renderer with Jinja2 + CSS inlining.

Features:
- Jinja2 templates with layout/partial/macro support
- CSS inlining via premailer (email client compatibility)
- Multi-language support (TR/EN)
- HTML + plain text fallback
- Template caching for production

Dependencies:
- pip install jinja2 premailer html2text

Refs:
- https://jinja.palletsprojects.com/
- https://github.com/peterbe/premailer
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, Any

from jinja2 import (
    Environment,
    FileSystemLoader,
    select_autoescape,
    FileSystemBytecodeCache,
)

try:
    from premailer import transform
except ImportError:
    # Fallback if premailer not installed
    def transform(html: str, **kwargs) -> str:
        return html

try:
    import html2text
except ImportError:
    # Fallback if html2text not installed
    class html2text:
        @staticmethod
        def html2text(html: str) -> str:
            # Simple HTML stripping fallback
            import re
            text = re.sub(r'<[^>]+>', '', html)
            return text


logger = logging.getLogger(__name__)


# Template directory
TEMPLATES_DIR = Path(__file__).parent / "templates"

# Bytecode cache for production (speeds up template loading)
CACHE_DIR = Path(".cache/jinja")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

bytecode_cache = FileSystemBytecodeCache(
    directory=str(CACHE_DIR),
    pattern="%s.cache"
)

# Jinja2 environment
env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
    bytecode_cache=bytecode_cache,
    trim_blocks=True,
    lstrip_blocks=True,
)


def render_email(
    template_name: str,
    locale: str,
    context: Dict[str, Any],
) -> Dict[str, str]:
    """
    Render email template to HTML and plain text.
    
    Args:
        template_name: Template name (e.g., "order_confirmation")
        locale: Language code ("tr" or "en")
        context: Template context variables
    
    Returns:
        Dict with "html", "text", and "subject" keys
    
    Example:
        >>> result = render_email(
        ...     "order_confirmation",
        ...     "tr",
        ...     {"order": {...}, "customer": {...}}
        ... )
        >>> print(result["html"])  # Inlined CSS HTML
        >>> print(result["text"])  # Plain text fallback
        >>> print(result["subject"])  # Email subject from template
    """
    try:
        # Load HTML template
        html_template_path = f"{locale}/emails/{template_name}.html.j2"
        html_tpl = env.get_template(html_template_path)
        
        # Create a module to capture template variables
        template_module = html_tpl.make_module(context)
        
        # Render HTML
        html_raw = html_tpl.render(**context)
        
        # Extract subject from template (if set)
        subject = getattr(template_module, "subject", None)
        
        # Inline CSS for email client compatibility
        html_inlined = transform(html_raw, strip_important=False)
        
        # Try to load plain text template
        try:
            txt_template_path = f"{locale}/emails/{template_name}.txt.j2"
            txt_tpl = env.get_template(txt_template_path)
            text = txt_tpl.render(**context)
        except Exception:
            # Fallback: convert HTML to plain text
            text = html2text.html2text(html_inlined)
        
        logger.debug(
            f"Rendered email template",
            extra={
                "template": template_name,
                "locale": locale,
                "subject": subject,
                "html_length": len(html_inlined),
                "text_length": len(text),
            }
        )
        
        return {
            "html": html_inlined,
            "text": text,
            "subject": subject,
        }
    
    except Exception as exc:
        logger.error(
            f"Failed to render email template",
            extra={
                "template": template_name,
                "locale": locale,
                "error": str(exc),
            },
            exc_info=True,
        )
        raise


def get_available_templates(locale: str) -> list[str]:
    """
    Get list of available email templates for a locale.
    
    Args:
        locale: Language code ("tr" or "en")
    
    Returns:
        List of template names (without .html.j2 extension)
    """
    templates_path = TEMPLATES_DIR / locale / "emails"
    
    if not templates_path.exists():
        return []
    
    templates = []
    for file in templates_path.glob("*.html.j2"):
        # Remove .html.j2 extension (e.g., "order_confirmation.html.j2" -> "order_confirmation")
        template_name = file.name.replace(".html.j2", "")
        templates.append(template_name)
    
    return sorted(templates)
