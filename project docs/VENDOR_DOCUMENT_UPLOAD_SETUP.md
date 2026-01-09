# Vendor Document Upload Setup Guide

## Overview

Vendor registration now includes Aadhaar Card and PAN Card document uploads using Cloudinary. Documents are stored securely and can be viewed by admins during vendor approval and in vendor profile views.

## Implementation Summary

### Frontend Changes

1. **DocumentUpload Component** (`FarmCommerce/Frontend/src/modules/Vendor/components/DocumentUpload.jsx`)
   - New component for uploading documents (Aadhaar and PAN)
   - Uses Cloudinary Upload Widget
   - Supports PDF, JPG, JPEG, PNG formats
   - Maximum file size: 10MB

2. **VendorRegistration Form** (`FarmCommerce/Frontend/src/modules/Vendor/pages/vendor/VendorRegistration.jsx`)
   - Added Aadhaar Card upload field (required)
   - Added PAN Card upload field (required)
   - Integrated DocumentUpload component
   - Validates documents before submission

3. **Admin Views**
   - **VendorApprovalModal**: Displays documents during approval process
   - **Vendors Page Detail View**: Shows documents in vendor profile

### Backend Changes

1. **Vendor Model** (`FarmCommerce/Backend/models/Vendor.js`)
   - Added `aadhaarCard` field with structure:
     ```javascript
     {
       url: String,
       publicId: String,
       format: String (enum: 'pdf', 'jpg', 'jpeg', 'png'),
       uploadedAt: Date
     }
     ```
   - Added `panCard` field with same structure

2. **Vendor Registration Endpoint** (`FarmCommerce/Backend/controllers/vendorController.js`)
   - Updated to accept `aadhaarCard` and `panCard` in request body
   - Validates that both documents are provided
   - Saves document URLs to vendor record

## Cloudinary Setup

### Using Existing Preset

The implementation uses the existing `ira-sathi-products` upload preset. This preset should already be configured in your Cloudinary dashboard.

### Optional: Create Dedicated Preset for Documents

If you want a separate preset for vendor documents:

1. Go to [Cloudinary Dashboard](https://cloudinary.com/console)
2. Navigate to **Settings** → **Upload**
3. Click **Add upload preset**
4. Configure:
   - **Preset name**: `ira-sathi-vendor-docs`
   - **Signing mode**: **Unsigned**
   - **Folder**: `ira-sathi/vendor-documents`
   - **Use filename**: ✅ Enable
   - **Unique filename**: ✅ Enable
   - **Overwrite**: ❌ Disable
   - **Resource type**: **Auto** (supports both images and PDFs)
5. **Incoming transformation**: No transformation needed (keep documents as-is)
6. Click **Save**

Then update `DocumentUpload.jsx` to use the new preset:
```javascript
uploadPreset: 'ira-sathi-vendor-docs'
```

## Document Storage Structure

Documents are stored in Cloudinary with the following structure:
- **Folder**: `ira-sathi/vendor-documents/`
- **Naming**: Auto-generated unique filenames
- **Formats**: PDF, JPG, JPEG, PNG
- **Max Size**: 10MB per document

## Workflow

### Vendor Registration Flow

1. Vendor fills registration form
2. Vendor uploads Aadhaar Card (required)
3. Vendor uploads PAN Card (required)
4. Documents are uploaded to Cloudinary
5. Document URLs are sent to backend with registration data
6. Backend saves document URLs to vendor record
7. Vendor status set to `pending` (awaiting admin approval)

### Admin Approval Flow

1. Admin views vendor in Vendors screen
2. Admin clicks "Approve" or views vendor details
3. Documents are displayed in:
   - **VendorApprovalModal**: Shows documents during approval
   - **Vendor Detail View**: Shows documents in profile
4. Admin can click "View Document" to open in new tab
5. Admin approves/rejects vendor based on document verification

## Document Display

### In VendorApprovalModal
- Shows Aadhaar and PAN cards side by side
- Displays image preview for image formats
- Shows PDF icon for PDF documents
- "View Document" link opens document in new tab
- Green checkmark if uploaded, red X if missing

### In Vendor Detail View
- Same layout as approval modal
- Documents shown in "Verification Documents" section
- Full document preview with view link

## API Endpoints

### Vendor Registration
```
POST /api/vendors/auth/register
Body: {
  name: string,
  email: string,
  phone: string,
  location: object,
  aadhaarCard: {
    url: string,
    publicId: string,
    format: string
  },
  panCard: {
    url: string,
    publicId: string,
    format: string
  }
}
```

### Get Vendor Details (Admin)
```
GET /api/admin/vendors/:vendorId
Response includes: {
  vendor: {
    aadhaarCard: { url, publicId, format, uploadedAt },
    panCard: { url, publicId, format, uploadedAt },
    ...
  }
}
```

## Security Notes

- ✅ Documents stored securely in Cloudinary
- ✅ URLs are HTTPS
- ✅ Documents organized in dedicated folder
- ✅ Unique filenames prevent overwriting
- ✅ File type validation (PDF, JPG, JPEG, PNG only)
- ✅ File size limits (10MB max)
- ✅ Documents only accessible via secure URLs

## Testing Checklist

- [ ] Vendor can upload Aadhaar Card during registration
- [ ] Vendor can upload PAN Card during registration
- [ ] Registration fails if documents are missing
- [ ] Documents are saved correctly in database
- [ ] Admin can view documents in approval modal
- [ ] Admin can view documents in vendor detail view
- [ ] PDF documents display correctly
- [ ] Image documents display correctly
- [ ] "View Document" links work correctly
- [ ] Documents are stored in correct Cloudinary folder

## Troubleshooting

### Documents Not Uploading
1. Check Cloudinary upload preset is configured
2. Verify internet connection
3. Check browser console for errors
4. Verify file size is under 10MB
5. Verify file format is supported

### Documents Not Displaying
1. Check vendor record in database has document URLs
2. Verify Cloudinary URLs are accessible
3. Check browser console for image loading errors
4. Verify document format is supported

### PDF Documents Not Viewing
- PDFs open in new tab via "View Document" link
- Ensure browser has PDF viewer enabled
- Check Cloudinary URL is accessible

## Notes

- Documents are required for vendor registration
- Both Aadhaar and PAN cards must be uploaded
- Documents cannot be changed after registration (future enhancement)
- Documents are stored permanently in Cloudinary
- Free Cloudinary tier should be sufficient for document storage


