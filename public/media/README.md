# Media Assets Directory

This directory contains image and video media assets for Carsera.

## Structure

```
public/media/
├── images/          # Image assets (logos, icons, banners, etc.)
└── videos/          # Video assets (promotional videos, tutorials, etc.)
```

## Usage

### Images

Place image files in the `images/` directory. Access them in your code using:

```tsx
// In Next.js, public folder is served from root
<img src="/media/images/logo.png" alt="Logo" />
```

### Videos

Place video files in the `videos/` directory. Access them in your code using:

```tsx
<video src="/media/videos/promo.mp4" controls />
```

## File Naming Conventions

- Use lowercase letters and hyphens for file names
- Example: `hero-banner.jpg`, `logo-icon.svg`, `promo-video.mp4`
- Keep file names descriptive and consistent

## Optimization

- Compress images before uploading (use tools like TinyPNG, ImageOptim)
- Use appropriate formats:
  - **Images**: WebP (preferred), PNG (transparency), JPG (photos)
  - **Videos**: MP4 (web standard), WebM (alternative)
- Consider responsive images for different screen sizes

## Size Guidelines

- **Images**: Keep under 500KB when possible
- **Videos**: Keep under 5MB for web use, consider hosting large videos externally

## External Hosting

For large media files, consider using:
- Supabase Storage (already configured for vehicle photos)
- CDN services (Cloudflare, AWS CloudFront)
- Video hosting (YouTube, Vimeo) for large videos
