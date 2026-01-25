# KLINEO Logo Usage Guidelines

## Logo Assets

### Standalone Icon (K Badge)
- **File**: `figma:asset/2155d7c44a35a506acdc6c9058e7618ade0238bc.png` (small)
- **File**: `figma:asset/bdb42a28b1ff7e16e1e2714565a2b72b338465de.png` (large)
- **File**: `figma:asset/4a52b2718df23b0bc41f7d66e77c7a81670855ca.png` (favicon)
- **Description**: Square black badge with off-white capital K and thin amber underline

### Wordmark
- **File**: `figma:asset/1fa460da5408b0af2529206309b8ef37bafcce67.png` (dark background)
- **File**: `figma:asset/ce7cf7fe1d4a65b9bc1b031de0649c40973b6660.png` (light background)
- **Description**: "KLINEO" in uppercase technical sans-serif with underline

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
