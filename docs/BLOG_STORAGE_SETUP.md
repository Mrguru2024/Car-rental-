# Blog Storage Bucket Setup

## Overview

The blog system requires a Supabase storage bucket for uploading blog images (featured images, OG images, and inline content images).

## Required Storage Bucket

### Bucket: `blog-images`

- **Name**: `blog-images`
- **Public**: Yes (public) - Images need to be publicly accessible for blog posts
- **File size limit**: 10 MB (adjust as needed)
- **Allowed MIME types**: `image/jpeg,image/png,image/jpg,image/webp,image/gif`

## Setup Instructions

1. **Go to your Supabase Dashboard**

   - Visit https://supabase.com/dashboard
   - Select your project

2. **Navigate to Storage**

   - Click on **Storage** in the left sidebar
   - Click **New bucket** button

3. **Create the `blog-images` Bucket**

   - **Name**: `blog-images`
   - **Public**: Yes (public) - This allows blog images to be displayed publicly
   - **File size limit**: 10 MB
   - **Allowed MIME types**: `image/jpeg,image/png,image/jpg,image/webp,image/gif`
   - Click **Create bucket**

4. **Configure Storage Policies**

   After creating the bucket, you need to set up storage policies. Go to **Storage** > **blog-images** > **Policies**.

   #### Policy 1: Authenticated users can upload blog images

   - **Policy name**: "Authenticated users can upload blog images"
   - **Allowed operation**: INSERT
   - **Target roles**: authenticated
   - **Policy definition**:

   ```sql
   (bucket_id = 'blog-images'::text)
   AND (auth.role() = 'authenticated')
   ```

   #### Policy 2: Public read access for blog images

   - **Policy name**: "Public can read blog images"
   - **Allowed operation**: SELECT
   - **Target roles**: anon, authenticated
   - **Policy definition**:

   ```sql
   (bucket_id = 'blog-images'::text)
   ```

   #### Policy 3: Users can update their own uploaded images

   - **Policy name**: "Users can update own blog images"
   - **Allowed operation**: UPDATE
   - **Target roles**: authenticated
   - **Policy definition**:

   ```sql
   (bucket_id = 'blog-images'::text)
   AND (auth.uid()::text = (storage.foldername(name))[1])
   ```

   #### Policy 4: Users can delete their own uploaded images

   - **Policy name**: "Users can delete own blog images"
   - **Allowed operation**: DELETE
   - **Target roles**: authenticated
   - **Policy definition**:

   ```sql
   (bucket_id = 'blog-images'::text)
   AND (auth.uid()::text = (storage.foldername(name))[1])
   ```

## File Structure

Images are stored with the following structure:

```
blog-images/
  └── {user_id}/
      └── blog/
          └── {timestamp}.{ext}
```

Example:

```
blog-images/
  └── 123e4567-e89b-12d3-a456-426614174000/
      └── blog/
          └── 1704067200000.jpg
```

## Usage

The blog system uses this bucket for:

1. **Featured Images**: Main image displayed at the top of blog posts
2. **OG Images**: Open Graph images for social media sharing
3. **Inline Images**: Images inserted directly into blog post content via the rich text editor

## Verification

After setup, verify the bucket is working:

1. Go to `/admin/blog/new` in your application
2. Try uploading a featured image
3. Check that the image appears in the preview
4. Verify the image URL is accessible publicly

## Troubleshooting

### "Bucket not found" error

- Ensure the bucket name is exactly `blog-images` (case-sensitive)
- Verify the bucket was created successfully in Supabase dashboard

### "Permission denied" error

- Check that storage policies are correctly configured
- Verify the user is authenticated
- Ensure the bucket is set to public if you want public read access

### Images not displaying

- Verify the bucket is set to **Public**
- Check that the public URL is correctly generated
- Ensure CORS is properly configured if accessing from external domains
