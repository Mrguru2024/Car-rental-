# Auto.dev API Integration Setup

This document describes the Auto.dev API integration for vehicle photo retrieval.

## Overview

Auto.dev provides professional vehicle photos based on VIN (Vehicle Identification Number). **Note:** NHTSA is used as the primary VIN decoder (see `NHTSA_SETUP.md`). Auto.dev is used exclusively for fetching vehicle photos.

## API Key Setup

1. **Get your API key from Auto.dev**
   - Sign up at [auto.dev](https://auto.dev)
   - Obtain your API key from the dashboard

2. **Add to environment variables**
   
   Add the following to your `.env.local` file:
   ```env
   AUTO_DEV_API_KEY=sk_ad_9WfReAZBam8w_Ex4rpXU8Yjr
   ```

   For production (Vercel), add it to your environment variables in the Vercel dashboard.

## API Endpoints

### VIN Lookup (Combined NHTSA + Auto.dev)
- **Endpoint:** `GET /api/vehicles/vin-lookup?vin={VIN}&modelyear={YEAR}`
- **Description:** Uses NHTSA for VIN decoding (primary) and Auto.dev for photos
- **Examples:**
  ```bash
  # Basic lookup
  curl "http://localhost:3000/api/vehicles/vin-lookup?vin=5UXWX7C5*BA"
  
  # With model year for better accuracy
  curl "http://localhost:3000/api/vehicles/vin-lookup?vin=5UXWX7C5*BA&modelyear=2011"
  ```
  
  **Response includes:**
  - Vehicle data from NHTSA (make, model, year, engine specs, etc.)
  - Photos from Auto.dev (if available)
  
  **Direct Auto.dev Photos API call:**
  ```javascript
  const response = await fetch('https://api.auto.dev/photos/3GCUDHEL3NG668790', {
    headers: {
      Authorization: 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json',
    },
  })
  
  const photos = await response.json()
  console.log(`Found ${photos.data.retail.length} retail photos`)
  ```

### Response Format
```json
{
  "success": true,
  "data": {
    "vin": "WP0AF2A99KS165242",
    "year": 2019,
    "make": "Porsche",
    "model": "911",
    "trim": "Carrera",
    "bodyType": "Coupe",
    "driveType": "RWD",
    "transmission": "Manual",
    "engine": {
      "cylinders": 6,
      "displacement": 3.0,
      "fuelType": "Gasoline",
      "horsepower": 370
    },
    "colors": {
      "exterior": ["White"],
      "interior": ["Black"]
    },
    "mpg": {
      "city": 20,
      "highway": 26
    },
    "msrp": 91100
  },
  "photos": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ]
}
```

## Features

### 1. VIN Lookup in Vehicle Form
- Dealers can enter a VIN in the vehicle creation form
- Clicking "Lookup VIN" automatically fills:
  - Make
  - Model
  - Year
  - Fetches professional photos from Auto.dev

### 2. Auto.dev Photos Integration
- Photos from Auto.dev are automatically added to the vehicle
- Photos are stored as URLs in the `vehicle_photos` table
- Up to 10 photos are fetched per vehicle

### 3. VIN Storage
- VIN is stored in the `vehicles.vin` column
- Indexed for fast lookups
- Optional field (can be null)

## Usage in Vehicle Form

1. Navigate to `/dealer/vehicles/new`
2. Enter a 17-character VIN in the "Quick Fill with VIN" section
3. Click "Lookup VIN"
4. Vehicle details are automatically filled
5. Photos from Auto.dev are added to the photo previews
6. You can still upload additional photos manually
7. Complete the form and submit

## API Rate Limits

Check Auto.dev documentation for current rate limits. The integration includes error handling for rate limit responses.

## Error Handling

- **Invalid VIN format:** Returns 400 error
- **VIN not found:** Returns 404 error
- **API key missing:** Returns 500 error with configuration message
- **Network errors:** Logged and user-friendly error message shown

## Database Schema

### Vehicles Table
```sql
ALTER TABLE vehicles
ADD COLUMN vin TEXT;

CREATE INDEX idx_vehicles_vin ON vehicles(vin);
```

## Code Structure

- **`lib/api/autodev.ts`** - Auto.dev API client functions
- **`app/api/vehicles/vin-lookup/route.ts`** - VIN lookup API endpoint
- **`app/dealer/vehicles/new/VehicleFormClient.tsx`** - Vehicle form with VIN lookup UI

## Testing

Test the integration with a known VIN:
```bash
# Example VIN: 2019 Porsche 911
curl "http://localhost:3000/api/vehicles/vin-lookup?vin=WP0AF2A99KS165242"
```

## Troubleshooting

### "AUTO_DEV_API_KEY is not configured"
- Ensure the environment variable is set in `.env.local`
- Restart your development server after adding the variable
- For production, verify the variable is set in Vercel

### "Vehicle not found for this VIN"
- Verify the VIN is correct (17 characters)
- Some older vehicles may not be in Auto.dev's database
- Try a different VIN or manually enter vehicle details

### "Failed to lookup VIN"
- Check your internet connection
- Verify the API key is valid
- Check Auto.dev service status
- Review server logs for detailed error messages
