/**
 * Strip dangerous HTML tags and attributes from user input.
 * Removes <script>, event handlers (onclick, onerror, etc.),
 * javascript: URLs, and data: URLs.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return input;

  return input
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove event handlers (on*)
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\s*on\w+\s*=\s*\S+/gi, "")
    // Remove javascript: and data: URLs
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:[^,]*,/gi, "")
    // Remove iframe, object, embed tags
    .replace(/<\s*(iframe|object|embed|form)\b[^>]*>/gi, "")
    .replace(/<\/\s*(iframe|object|embed|form)\s*>/gi, "");
}

/**
 * Clean user input: trim whitespace, remove null bytes and control characters.
 */
export function sanitizeInput(input: string): string {
  if (!input) return input;

  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove control characters (except newline, tab)
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Sanitize all string values in an object (shallow).
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "string") {
      (result as Record<string, unknown>)[key] = sanitizeInput(sanitizeHtml(value));
    }
  }
  return result;
}
