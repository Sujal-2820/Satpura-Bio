# Vendor Dashboard Structure & Styling Guide

## Overview
Vendor Dashboard एक mobile-first design है जो `MobileShell` component के अंदर wrap होता है। यह एक fixed-width (max-width: 420px) container है जो mobile devices के लिए optimize किया गया है।

---

## Main Structure

### 1. **Root Container** - `.vendor-shell`
```13:25:vendor.css
.vendor-shell {
  position: relative;
  margin: 0 auto;
  display: flex;
  min-height: 100vh;
  width: 100%;
  max-width: 420px;
  flex-direction: column;
  background: linear-gradient(180deg, #fbfefb 0%, #f1f4ed 60%, #f4f1ea 100%);
  color: var(--vendor-ink);
  overflow-x: hidden;
  isolation: isolate;
}
```

**Key Points:**
- **Max-width**: 420px (mobile-first design)
- **Background**: Gradient from light green to cream
- **Position**: Centered with `margin: 0 auto`
- **Layout**: Flex column layout

---

### 2. **Header** - `.vendor-shell-header`
```45:68:vendor.css
.vendor-shell-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 0.75rem 1.25rem 0.5rem;
  border-bottom-left-radius: 26px;
  border-bottom-right-radius: 26px;
  background: #8fc4a5;
  border-bottom: 1px solid transparent;
  box-shadow: 0 4px 16px -8px rgba(34, 94, 65, 0.15), 0 0 0 0 rgba(34, 94, 65, 0.08);
  overflow: visible;
  transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  will-change: padding;
  max-width: 420px;
  margin: 0 auto;
  width: 100%;
}
```

**Key Points:**
- **Position**: Fixed at top (z-index: 30)
- **Background**: Green (#8fc4a5)
- **Border Radius**: Bottom corners rounded (26px)
- **Compact Mode**: Scroll के साथ compact हो जाता है
- **Max-width**: 420px (centered)

**Header Components:**
- `.vendor-shell-header__controls`: Search, Notification, Menu buttons
- `.vendor-shell-header__info`: Title और location info
- `.vendor-shell-header__brand`: Logo

---

### 3. **Content Area** - `.vendor-shell-content`
```204:209:vendor.css
.vendor-shell-content {
  flex: 1;
  padding: 1.5rem 1.25rem 6rem;
  padding-top: calc(1.5rem + 115px);
  padding-bottom: calc(1.5rem + 80px);
}
```

**Key Points:**
- **Padding-top**: Header height के लिए adjusted (115px)
- **Padding-bottom**: Bottom nav के लिए adjusted (80px)
- **Spacing**: `space-y-6` class से vertical spacing

---

### 4. **Bottom Navigation** - `.vendor-shell-bottom-nav`
```211:229:vendor.css
.vendor-shell-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 25;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 0.45rem 1rem;
  padding-bottom: calc(0.7rem + env(safe-area-inset-bottom));
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.95), rgba(240, 248, 242, 0.98));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 -4px 24px -8px rgba(15, 23, 42, 0.2);
  border-top: 1px solid rgba(34, 94, 65, 0.08);
}
```

**Key Points:**
- **Position**: Fixed at bottom (z-index: 25)
- **Background**: Semi-transparent white gradient with blur
- **Border Radius**: Top corners rounded (24px)
- **Safe Area**: iOS safe area inset support

---

## Overview Tab Structure

### 1. **Overview Container** - `.vendor-overview`
```285:289:vendor.css
.vendor-overview {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}
```

### 2. **Hero Section** - `.overview-hero`
```291:300:vendor.css
.overview-hero {
  position: relative;
}

.overview-hero__card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  padding: 1.35rem 1.4rem 1.5rem;
```

**Components:**
- `.overview-hero__meta`: Chips (Active Zone, Date)
- `.overview-hero__core`: Greeting और name
- `.overview-hero__balance`: Available money display
- `.overview-hero__stats`: Statistics cards

### 3. **Section Structure** - `.overview-section`
```1571:1582:vendor.css
.overview-section {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.overview-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
```

**Sections:**
- **Shortcuts** (`.overview-services__rail`): Horizontal scrollable service cards
- **Recent Activity** (`.overview-activity__list`): Activity timeline
- **Quick Summary** (`.overview-metric-grid`): Metric cards grid
- **Quick Actions** (`.overview-callout-grid`): Action cards grid

---

## Key Styling Patterns

### Color Scheme
```3:11:vendor.css
:root {
  --vendor-green-600: #1b8f5b;
  --vendor-green-500: #2a9d61;
  --vendor-green-300: #6bc48f;
  --vendor-brown-600: #9b6532;
  --vendor-brown-400: #b07a45;
  --vendor-cream: #f9f6ef;
  --vendor-ink: #172022;
}
```

### Card Styling Pattern
Cards generally follow this pattern:
- **Border Radius**: 18-20px
- **Background**: White with subtle gradients
- **Border**: Light green/brown borders
- **Box Shadow**: Soft shadows for depth
- **Padding**: 0.85rem - 1.5rem

**Example - Service Card:**
```1639:1649:vendor.css
.overview-service-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.4rem;
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid rgba(34, 94, 65, 0.15);
  background: linear-gradient(160deg, #ffffff 0%, #f0f8f3 85%);
  box-shadow: 0 18px 40px -30px rgba(13, 38, 24, 0.35);
}
```

### Stat Card Pattern
```1533:1550:vendor.css
.overview-stat-card {
  padding: 1rem 1.15rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(140, 165, 145, 0.32);
  box-shadow: 0 18px 38px -28px rgba(22, 42, 31, 0.45);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.7rem;
  letter-spacing: 0.035em;
  line-height: 1.4;
  text-transform: uppercase;
  overflow: hidden;
  box-sizing: border-box;
}
```

---

## Positioning Details

### Fixed Elements
1. **Header**: `position: fixed; top: 0; z-index: 30`
2. **Bottom Nav**: `position: fixed; bottom: 0; z-index: 25`
3. **Search Sheet**: `position: fixed; inset: 0; z-index: 60`
4. **Activity Sheet**: `position: fixed; inset: 0; z-index: 50`
5. **Side Menu**: `position: fixed; z-index: 50`

### Spacing System
- **Section Gap**: 1.75rem (28px)
- **Card Padding**: 1rem - 1.5rem
- **Element Gap**: 0.75rem - 1rem
- **Content Padding**: 1.25rem horizontal

### Responsive Behavior
- **Max-width**: 420px (mobile-first)
- **Centered**: `margin: 0 auto`
- **Safe Area**: iOS safe area insets supported
- **Scroll Behavior**: Header compact होता है scroll पर

---

## Component Hierarchy

```
VendorDashboard
└── MobileShell
    ├── Header (Fixed)
    │   ├── Brand/Logo
    │   ├── Actions (Search, Notification, Menu)
    │   └── Info (Title, Location)
    ├── Content (Scrollable)
    │   └── Tab Views
    │       ├── OverviewView
    │       │   ├── Hero Section
    │       │   ├── Services Section
    │       │   ├── Activity Section
    │       │   ├── Snapshot Section
    │       │   └── Quick Actions
    │       ├── InventoryView
    │       ├── OrdersView
    │       ├── CreditView
    │       ├── EarningsView
    │       └── ReportsView
    └── Bottom Navigation (Fixed)
        └── Navigation Items
```

---

## Key CSS Classes Reference

### Layout Classes
- `.vendor-shell` - Main container
- `.vendor-shell-header` - Fixed header
- `.vendor-shell-content` - Scrollable content area
- `.vendor-shell-bottom-nav` - Fixed bottom navigation

### Overview Classes
- `.vendor-overview` - Overview container
- `.overview-hero` - Hero section
- `.overview-section` - Generic section wrapper
- `.overview-services__rail` - Horizontal scrollable services
- `.overview-activity__list` - Activity list
- `.overview-metric-grid` - Metrics grid
- `.overview-callout-grid` - Quick actions grid

### Card Classes
- `.overview-hero__card` - Hero card
- `.overview-service-card` - Service card
- `.overview-stat-card` - Statistics card
- `.overview-activity__item` - Activity item
- `.overview-metric-card` - Metric card
- `.overview-callout` - Action callout

### Sheet/Modal Classes
- `.vendor-search-sheet` - Search overlay
- `.vendor-activity-sheet` - Activity overlay
- `.vendor-search-sheet__panel` - Search panel
- `.vendor-activity-sheet__panel` - Activity panel

---

## Important Notes

1. **Mobile-First**: Design 420px max-width पर centered है
2. **Fixed Positioning**: Header और bottom nav fixed हैं
3. **Z-Index Hierarchy**: 
   - Search: 60
   - Activity/Menu: 50
   - Header: 30
   - Bottom Nav: 25
4. **Spacing**: Consistent spacing system (`space-y-6`, gaps)
5. **Colors**: Green theme with cream/brown accents
6. **Typography**: Manrope font family
7. **Transitions**: Smooth transitions for interactions
8. **Backdrop Blur**: Modern glassmorphism effects

---

## File Locations

- **Component**: `Frontend/src/modules/Vendor/pages/vendor/VendorDashboard.jsx`
- **Styles**: `Frontend/src/modules/Vendor/vendor.css`
- **MobileShell**: `Frontend/src/modules/Vendor/components/MobileShell.jsx`













