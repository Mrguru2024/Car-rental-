# Tailwind Brand Color & Typography Enforcement Guide

## Carsera – UI Build Rules

---

## 1. BRAND COLOR TOKENS (LOCKED)

All UI styling MUST use the following Tailwind color tokens only.  
No hex colors may be hardcoded outside this section.

### Core Brand Colors

| Token Name    | Hex Value | Usage                              |
| ------------- | --------- | ---------------------------------- |
| `brand-navy`  | `#0B1C2D` | App shell, header, footer          |
| `brand-blue`  | `#1F6AE1` | Links, tabs, active states         |
| `brand-green` | `#2ECC71` | Primary CTA (Book / Pay / Confirm) |
| `brand-white` | `#F5F7FA` | Page background                    |
| `brand-gray`  | `#6B7280` | Secondary text, muted labels       |

---

## 2. TAILWIND CONFIGURATION (REQUIRED)

Extend Tailwind colors in `tailwind.config.js` as follows:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0B1C2D",
          blue: "#1F6AE1",
          green: "#2ECC71",
          white: "#F5F7FA",
          gray: "#6B7280",
        },
      },
    },
  },
};
```
