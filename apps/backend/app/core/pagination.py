"""
Pagination utilities for RFC 8288 Link headers.
Implements Web Linking standard for cursor-based pagination.
"""
from typing import Optional
from fastapi import Request, Response
from urllib.parse import urlencode


def build_link_header(
    request: Request,
    next_cursor: Optional[str] = None,
    prev_cursor: Optional[str] = None
) -> str:
    """
    Build RFC 8288 Link header for pagination.
    
    Format:
        Link: <url?cursor=abc>; rel="next", <url?cursor=def>; rel="prev"
    
    Args:
        request: FastAPI request object
        next_cursor: Cursor for next page
        prev_cursor: Cursor for previous page
        
    Returns:
        Link header value
        
    Example:
        Link: </api/v1/products?cursor=abc123&limit=20>; rel="next"
    """
    links = []
    
    # Get base URL and query params
    base_url = str(request.url).split('?')[0]
    query_params = dict(request.query_params)
    
    # Next link
    if next_cursor:
        next_params = query_params.copy()
        next_params['cursor'] = next_cursor
        next_url = f"{base_url}?{urlencode(next_params)}"
        links.append(f'<{next_url}>; rel="next"')
    
    # Previous link
    if prev_cursor:
        prev_params = query_params.copy()
        prev_params['cursor'] = prev_cursor
        prev_url = f"{base_url}?{urlencode(prev_params)}"
        links.append(f'<{prev_url}>; rel="prev"')
    
    return ', '.join(links)


def set_pagination_headers(
    request: Request,
    response: Response,
    next_cursor: Optional[str] = None,
    prev_cursor: Optional[str] = None,
    total_count: Optional[int] = None
) -> None:
    """
    Set pagination headers on response.
    
    Sets:
    - Link header (RFC 8288) with next/prev cursors
    - X-Total-Count header (if total_count provided)
    
    Args:
        request: FastAPI request object
        response: FastAPI response object
        next_cursor: Cursor for next page
        prev_cursor: Cursor for previous page
        total_count: Optional total count of items
    """
    # Set Link header
    if next_cursor or prev_cursor:
        link_header = build_link_header(request, next_cursor, prev_cursor)
        response.headers["Link"] = link_header
    
    # Set total count header
    if total_count is not None:
        response.headers["X-Total-Count"] = str(total_count)


def set_cache_headers(
    response: Response,
    max_age: int = 300,
    public: bool = True,
    etag: Optional[str] = None
) -> None:
    """
    Set cache control headers.
    
    Args:
        response: FastAPI response object
        max_age: Cache max age in seconds (default: 5 minutes)
        public: Whether cache is public or private
        etag: Optional ETag value
    """
    cache_directive = "public" if public else "private"
    response.headers["Cache-Control"] = f"{cache_directive}, max-age={max_age}"
    
    if etag:
        response.headers["ETag"] = etag
