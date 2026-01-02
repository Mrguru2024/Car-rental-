# Verification Storage Bucket Setup

## Problem
Getting "Bucket not found" error when uploading verification documents for dealer/host or renter verification.

## Solution
Create the `verification-docs` storage bucket in Supabase.

## Steps to Fix

1. **Go to your Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Navigate to Storage**
   - Click on **Storage** in the left sidebar
   - Click **New bucket** button

3. **Create the `verification-docs` Bucket**
   - **Name**: `verification-docs`
   - **Public**: No (private) - Keep this as private for security
   - **File size limit**: 10 MB (adjust as needed)
   - **Allowed MIME types**: `application/pdf,image/jpeg,image/png,image/jpg,image/webp`
   - Click **Create bucket**

4. **Configure Storage Policies**
   After creating the bucket, you need to set up storage policies. Go to **Storage** > **verification-docs** > **Policies**.

   #### Policy 1: Users can upload their own verification documents
   - **Policy name**: "Users can upload own verification documents"
   - **Allowed operation**: INSERT
   - **Target roles**: authenticated
   - **Policy definition**:
   ```sql
   (bucket_id = 'verification-docs'::text) 
   AND (auth.uid()::text = (storage.foldername(name))[1])
   ```

   #### Policy 2: Users can read their own verification documents
   - **Policy name**: "Users can read own verification documents"
   - **Allowed operation**: SELECT
   - **Target roles**: authenticated
   - **Policy definition**:
   ```sql
   (bucket_id = 'verification-docs'::text) 
   AND (auth.uid()::text = (storage.foldername(name))[1])
   ```

   #### Policy 3: Admins can read all verification documents
   - **Policy name**: "Admins can read all verification documents"
   - **Allowed operation**: SELECT
   - **Target roles**: authenticated
   - **Policy definition**:
   ```sql
   (bucket_id = 'verification-docs'::text)
   AND (
     EXISTS (
       SELECT 1 FROM profiles
       WHERE profiles.user_id = auth.uid()
       AND profiles.role = 'admin'
     )
   )
   ```

5. **Save Policies**
   - Click **Review** after creating each policy
   - Click **Save policy** to apply

## What Documents Are Stored

### For Renters:
- Driver's license front image
- Driver's license back image
- Selfie photo

### For Dealers/Hosts:
- Business license document
- Insurance document
- Tax document (optional)

## Storage Structure

Files are stored in the following structure:
```
verification-docs/
  {user_id}/
    {document-type}-{timestamp}.{ext}
```

Example:
```
verification-docs/
  ecfb53dc-7446-4738-8ba2-2bb9492eb3bc/
    business-license-1767388014064.pdf
    insurance-document-1767388014065.pdf
```

## Security Notes

- The bucket is **private** (not public) for security
- Users can only upload/read their own documents (based on folder structure)
- Admins can read all documents for verification review
- Documents are accessed via signed URLs when needed

## Testing

After setup:
1. Try uploading a verification document in the dealer/renter verification page
2. The upload should succeed without errors
3. You should see the document preview after upload

## Troubleshooting

If you still get errors after setup:
1. Verify the bucket name is exactly `verification-docs` (case-sensitive)
2. Check that storage policies are saved correctly
3. Verify the user is authenticated
4. Check browser console for more detailed error messages
5. Ensure the bucket is set to **private** (not public)
