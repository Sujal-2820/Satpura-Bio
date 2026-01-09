# Cloudinary Image Upload Setup Guide

This guide explains how to set up Cloudinary for product image uploads in the Admin Dashboard.

## Prerequisites

Cloudinary credentials are now configured via environment variables (.env):
- **Cloud Name**: `dhmtagkyz`
- **API Key**: `883114994776468`
- **API Secret**: `VOc-g-Ag-dGh7Jj4YbilWJpzaUA`

## Step 1: Create Unsigned Upload Preset

To enable image uploads from the frontend, you need to create an unsigned upload preset in your Cloudinary dashboard:

1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Navigate to **Settings** → **Upload**
3. Scroll down to **Upload presets** section
4. Click **Add upload preset**
5. Configure the preset:
   - **Preset name**: `ira-sathi-products`
   - **Signing mode**: Select **Unsigned**
   - **Folder**: `ira-sathi/products`
   - **Use filename**: ✅ Enable
   - **Unique filename**: ✅ Enable
   - **Overwrite**: ❌ Disable (to prevent overwriting existing images)
   
6. Under **Incoming transformation**, click **Edit** and add:
   - **Width**: `800`
   - **Height**: `800`
   - **Crop mode**: `Limit` (maintains aspect ratio, fits within dimensions)
   - **Quality**: `Auto: Good` (optimizes file size while maintaining quality)
   - **Format**: `Auto` (serves WebP when supported, falls back to original)

7. Click **Save**

## Step 2: Verify Configuration

The configuration file is located at:
```
FarmCommerce/Frontend/src/modules/Admin/config/cloudinary.js
```

Ensure the `uploadPreset` matches the preset name you created:
```javascript
uploadPreset: 'ira-sathi-products'
```

## How It Works

### Image Upload Flow

1. **Frontend Upload**: Admin selects images in the Product Form
2. **Cloudinary Upload Widget**: Opens a modal for image selection and upload
3. **Cloudinary Processing**: Images are automatically optimized and stored
4. **URL Returned**: Cloudinary returns the optimized image URL and public ID
5. **Form Submission**: Image URLs and metadata are included with product data
6. **Backend Storage**: URLs are saved to MongoDB in the product's `images` array

### Image Limits

- **Maximum Images**: 4 images per product
- **Maximum File Size**: 5MB per image
- **Supported Formats**: JPG, JPEG, PNG, WebP
- **Image Dimensions**: Automatically optimized to max 800x800px

### Image Structure

Images are stored in the database with the following structure:
```javascript
{
  url: "https://res.cloudinary.com/.../image.jpg",
  publicId: "ira-sathi/products/abc123",
  isPrimary: true,  // First image is always primary
  order: 0         // Display order (0-3)
}
```

### Primary Image

The first uploaded image is automatically set as the primary image. This is typically used as the product thumbnail.

## Image Optimization

Cloudinary automatically optimizes images during upload:

- **Format**: Auto-converts to WebP when supported by the browser
- **Quality**: Auto-adjusts to maintain visual quality while reducing file size
- **Dimensions**: Limits to 800x800px while maintaining aspect ratio
- **Compression**: Applies smart compression algorithms

This ensures:
- ✅ Faster page load times
- ✅ Reduced bandwidth usage
- ✅ Better mobile experience
- ✅ Optimal storage efficiency

## Troubleshooting

### Upload Widget Not Loading

If the upload widget doesn't appear:
1. Check browser console for errors
2. Verify internet connection
3. Ensure Cloudinary script is loading: Check Network tab for `upload-widget.cloudinary.com`

### Upload Preset Not Found

If you see "Upload preset not found":
1. Verify preset name matches: `ira-sathi-products`
2. Ensure preset is set to **Unsigned** mode
3. Check preset is saved in Cloudinary dashboard

### Images Not Saving

If images upload but don't save to database:
1. Check browser console for API errors
2. Verify backend endpoint is receiving image data
3. Check MongoDB to see if images array is being saved

### Image Quality Issues

If images appear pixelated or low quality:
1. Check Cloudinary transformation settings
2. Verify quality is set to `Auto: Good` or higher
3. Ensure source images are high enough resolution

## Testing

To test the image upload functionality:

1. **Create Product**:
   - Go to Admin Dashboard → Products
   - Click "Add Product"
   - Fill in required fields
   - Upload 1-4 images
   - Submit the form

2. **Edit Product**:
   - Select an existing product
   - Click "Edit"
   - Add/remove images
   - Save changes

3. **Verify**:
   - Check that images appear in the product list
   - Verify images are saved in database
   - Confirm image URLs are valid Cloudinary URLs

## Security Notes

- ✅ Unsigned upload presets are safe for public use
- ✅ Upload widget validates file types and sizes
- ✅ Images are stored in organized folders
- ✅ No sensitive credentials exposed in frontend code

## Support

For Cloudinary-specific issues, refer to:
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Upload Widget Documentation](https://cloudinary.com/documentation/upload_widget)

