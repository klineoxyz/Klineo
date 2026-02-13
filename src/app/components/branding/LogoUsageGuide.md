# KLINEO Logo Usage Guidelines

**Full brand kit:** Place `KLINEO-Brand-Kit.pdf` in `public/brand/` and open via footer link **Brand Guidelines** (`/brand/KLINEO-Brand-Kit.pdf`).

## Logo Assets (in `src/assets/`)

### Standalone Icon (K Badge)
- **Files**: `6c13e9a600576bf702d05a5cf77f566f05f5c6a4.png`, `klineo-icon-64.png`
- **Favicon**: `public/favicon.png` (same K icon)
- **Description**: Square black badge with white/silver capital K and yellow-gold underline

### Wordmark
- **Dark background**: `klineo-logo-dark-bg.png` — "KLINEO" in white/silver with white + yellow underline
- **Light background**: `klineo-logo-white-bg.png` — "KLINEO" in black with black + yellow underline
- **Description**: Uppercase bold italic wordmark with two-tone underline

## Usage Rules

### ✅ Use Standalone Icon For:
- Browser favicon
- App icon when sidebar is collapsed
- Loading/splash screens
- Mobile app icon
- Social profile avatar
- When space is limited

### ✅ Use Wordmark For:
- Top bar when sidebar is expanded
- Marketing website header
- Login screen header
- Onboarding screens
- Admin panel header
- Invoices and receipts
- When brand name must be readable

### 🚫 Never Do:
- Replace app icon with wordmark
- Place wordmark inside square badges
- Recolor the icon or wordmark
- Add glow, shadows, or animations
- Combine icon + wordmark together

## Sizing Guidelines

### Icon
- **Minimum**: 16×16px (favicon)
- **Preferred UI**: 24-32px
- **Clear space**: ¼ of icon width around all sides

### Wordmark
- **Minimum width**: 120px
- **Clear space**: Height of the K letter around all sides

## Implementation Examples

### TopBar Component
```tsx
{sidebarCollapsed ? (
  <img src={logoIconSmall} alt="KLINEO" className="h-6 w-6" />
) : (
  <img src={logoWordmarkDark} alt="KLINEO" className="h-6" style={{ minWidth: '120px' }} />
)}
```

### Sidebar Component
```tsx
{isCollapsed ? (
  <img src={logoIconSmall} alt="KLINEO" className="h-8 w-8" />
) : (
  <img src={logoWordmarkDark} alt="KLINEO" className="h-7" style={{ minWidth: '120px' }} />
)}
```

## Color Rules

- **Icon background**: Terminal black (#0B0D10) only
- **Wordmark on dark**: Use light wordmark
- **Wordmark on light**: Use dark wordmark
- **Amber accent**: Must remain unchanged (#FFB000)
- **No green/red**: Never use in logo assets

## Professional Restraint

KLINEO is a professional trading terminal. Brand clarity and restraint are mandatory:
- No emoji in logo context
- No decorative effects
- No animation except subtle fade-in on loading
- Maintain technical, operational aesthetic
