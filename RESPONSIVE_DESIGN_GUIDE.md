# Responsive Design Guide

## Breakpoint System

The application now uses a comprehensive breakpoint system optimized for all device sizes, including Samsung Z Fold:

### Custom Breakpoints (Tailwind Config)

- **xs**: `375px` - Large phones (iPhone X, Pixel, etc.)
- **fold**: `512px` - Samsung Z Fold unfolded, small tablets
- **sm**: `640px` - Small tablets
- **md**: `768px` - Tablets (iPad)
- **lg**: `1024px` - Small laptops
- **xl**: `1280px` - Desktops
- **2xl**: `1536px` - Large desktops
- **3xl**: `1920px` - Full HD displays
- **4xl**: `2560px` - Ultra-wide/QHD displays

### Samsung Z Fold Support

The `fold` breakpoint (512px) specifically handles:
- **Folded state**: ~280px wide (uses mobile styles)
- **Unfolded state**: ~512px wide (uses fold breakpoint, optimized for tablet-like experience)

## Responsive Patterns

### Container Padding
All pages use progressive padding:
```tsx
px-3 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16
```

### Grid Layouts
- **Mobile (default)**: 1 column
- **Z Fold unfolded (fold)**: 2 columns
- **Tablet (sm/md)**: 2-3 columns
- **Desktop (lg/xl)**: 3-4 columns
- **Large Desktop (2xl)**: 4+ columns

### Typography Scaling
- Headings: `text-xl xs:text-2xl sm:text-3xl lg:text-4xl`
- Body: `text-xs xs:text-sm sm:text-base`
- Buttons: `text-xs xs:text-sm sm:text-base`

### Touch Targets
All interactive elements meet minimum 44x44px touch target:
- Buttons: `min-h-[44px]` with `touch-manipulation`
- Icons: Proper padding for touch accessibility

## Component-Specific Responsive Features

### Header
- Logo scales: `h-10 xs:h-12 sm:h-14`
- Navigation items stack on mobile
- Responsive gap spacing: `gap-2 xs:gap-3 sm:gap-4`

### Search Forms
- Grid adapts: `grid-cols-1 fold:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`
- Inputs scale properly on all devices
- Buttons stack on mobile, inline on desktop

### Vehicle Cards
- Grid: `grid-cols-1 fold:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4`
- Images maintain aspect ratio
- Save button positioned responsively

### Calendar View
- Day cells: `min-h-16 fold:min-h-20 sm:min-h-24`
- Text scales: `text-[10px] fold:text-xs`
- Navigation buttons wrap on small screens

### Analytics Dashboard
- Metrics grid: `grid-cols-2 fold:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4`
- Chart height: `h-48 sm:h-64`
- Responsive bar widths for mobile scrolling

### Booking Cards
- Image: `w-full md:w-48` (full width on mobile, fixed on desktop)
- Info grid: `grid-cols-2 md:grid-cols-4`
- Action buttons stack on mobile

## Best Practices Applied

1. **Mobile-First**: Base styles target mobile, enhanced for larger screens
2. **Progressive Enhancement**: Features added at appropriate breakpoints
3. **Touch-Friendly**: All interactive elements meet accessibility standards
4. **Smooth Transitions**: CSS transitions for layout changes
5. **Content Priority**: Important content visible on all screen sizes
6. **Flexible Images**: Images scale and maintain aspect ratios
7. **Readable Text**: Minimum font sizes ensure readability

## Testing Checklist

- [x] Mobile phones (320px - 375px)
- [x] Large phones (375px - 414px)
- [x] Samsung Z Fold folded (280px)
- [x] Samsung Z Fold unfolded (512px)
- [x] Small tablets (640px - 768px)
- [x] Tablets (768px - 1024px)
- [x] Laptops (1024px - 1280px)
- [x] Desktops (1280px - 1920px)
- [x] Large desktops (1920px+)
- [x] Ultra-wide displays (2560px+)

## Key Files Updated

- `tailwind.config.ts` - Custom breakpoints added
- `app/globals.css` - Responsive utilities and transitions
- All page components - Responsive padding and grids
- All form components - Responsive inputs and buttons
- Layout components - Header and Footer responsive
- Dashboard components - Responsive metrics and charts
