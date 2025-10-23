# UI/UX Standards

## Design System

### Grid & Spacing

- Base unit: **4px** (Tailwind's default spacing scale)
- Container max-width: `1280px` (xl breakpoint)
- Gutter: `16px` (mobile), `24px` (desktop)

### Typography

- Font family: System font stack (Inter or similar)
- Scale: `text-xs` (12px) → `text-sm` (14px) → `text-base` (16px) → `text-lg` (18px) → `text-xl` (20px) → `text-2xl` (24px)
- Line height: `1.5` for body text, `1.2` for headings
- Font weights: `400` (normal), `500` (medium), `600` (semibold), `700` (bold)

### Colors

Use Tailwind's color palette with semantic naming:
- Primary: Brand color (e.g., `blue-600`)
- Secondary: Accent color
- Success: `green-600`
- Warning: `yellow-600`
- Error: `red-600`
- Neutral: `gray-*` scale

## Component Standards

### Loading States

- **Skeleton screens** for initial page loads
- **Spinners** for button actions
- **Progress bars** for multi-step processes
- Never show blank screens; always provide visual feedback

### Empty States

- Illustrative icon or image
- Clear message explaining why it's empty
- Call-to-action button when applicable
- Example: "No products in cart" → "Start Shopping" button

### Forms

**Validation:**
- Use React Hook Form + Zod
- Show errors below input fields
- Inline validation on blur
- Disable submit button during submission
- Show loading state on submit button

**Structure:**
```tsx
<form>
  <label>Field Label</label>
  <input />
  {error && <span className="text-red-600 text-sm">{error.message}</span>}
</form>
```

**Required fields:**
- Mark with asterisk (*) in label
- Provide clear error messages

### Buttons

- Primary: Solid background, high contrast
- Secondary: Outline or ghost style
- Disabled: Reduced opacity, no hover effect
- Loading: Show spinner, disable interaction

### Modals & Dialogs

- Use shadcn/ui Dialog component
- Backdrop overlay (semi-transparent)
- Close on ESC key
- Focus trap within modal
- Accessible close button

## Accessibility (a11y)

### Semantic HTML

- Use proper heading hierarchy (`h1` → `h2` → `h3`)
- Use `<button>` for actions, `<a>` for navigation
- Use `<nav>`, `<main>`, `<aside>`, `<footer>` landmarks

### ARIA Attributes

- `aria-label` for icon-only buttons
- `aria-describedby` for form field hints
- `aria-live` for dynamic content updates
- `role` attributes when semantic HTML isn't sufficient

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Visible focus indicators (never `outline: none` without replacement)
- Logical tab order
- Support ESC to close modals/dropdowns

### Color Contrast

- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text (18px+)
- Use tools like WebAIM Contrast Checker

## Internationalization (i18n)

### Translation Keys

- Use namespaced keys: `common.submit`, `product.addToCart`
- Store in JSON files: `locales/tr/common.json`, `locales/en/common.json`
- Use i18next with React

### Date & Number Formatting

- Use `Intl.DateTimeFormat` and `Intl.NumberFormat`
- Respect user's locale settings
- Currency: Show symbol and code (e.g., "₺1.234,56 TRY")

### RTL Support (Future)

- Design with RTL in mind (avoid hardcoded left/right)
- Use logical properties: `margin-inline-start` instead of `margin-left`

## Performance

### Images

- Use WebP format with fallback
- Lazy load below-the-fold images
- Provide `width` and `height` attributes
- Use responsive images (`srcset`)

### Code Splitting

- Route-based code splitting (React.lazy)
- Lazy load heavy components (charts, editors)

### Caching

- Cache API responses with TanStack Query
- Set appropriate `staleTime` and `cacheTime`

## SEO

### Meta Tags

- Unique `<title>` for each page (50-60 chars)
- Meta description (150-160 chars)
- Open Graph tags for social sharing
- Canonical URLs

### Structured Data

- Use JSON-LD for Product, BreadcrumbList, Organization
- Validate with Google's Rich Results Test

### Sitemap & Robots

- Generate dynamic sitemap.xml
- Configure robots.txt
- Submit to Google Search Console

## Mobile & PWA

### Responsive Design

- Mobile-first approach
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Touch-friendly targets (min 44x44px)

### PWA Features

- Service worker for offline support
- Web app manifest
- "Add to Home Screen" prompt
- Push notifications (with permission)

## Error Handling

### User-Facing Errors

- Clear, actionable messages
- Avoid technical jargon
- Provide next steps or support contact
- Example: "Payment failed. Please check your card details or try another payment method."

### Error Boundaries

- Wrap app in React Error Boundary
- Show friendly fallback UI
- Log errors to monitoring service

## Analytics & Tracking

- Google Analytics 4 (GA4)
- Facebook Conversion API (cAPI)
- Track key events: page views, add to cart, purchase, sign up
- Respect user's cookie preferences (KVKK compliance)
