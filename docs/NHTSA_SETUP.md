# NHTSA API Integration Setup

This document describes the NHTSA (National Highway Traffic Safety Administration) API integration for VIN decoding and vehicle data.

## Overview

NHTSA provides free, public VIN decoding services. This integration uses NHTSA as the **primary** VIN decoder, with Auto.dev used for vehicle photos.

## API Endpoints

NHTSA API is **free and public** - no API key required!

Base URL: `https://vpic.nhtsa.dot.gov/api/vehicles`

### Available Endpoints

1. **Decode VIN Extended** (Primary)
   - Endpoint: `/vehicles/DecodeVinExtended/{vin}?format=json&modelyear={year}`
   - Description: Comprehensive VIN decoding with extended vehicle information
   - Example: `GET /api/vehicles/vin-lookup?vin=5UXWX7C5*BA&modelyear=2011`

2. **Get All Makes**
   - Endpoint: `/vehicles/GetAllMakes?format=json`
   - Description: List all vehicle manufacturers
   - Example: `GET /api/vehicles/makes`

3. **Get Models for Make**
   - Endpoint: `/vehicles/GetModelsForMake/{make}?format=json`
   - Description: Get all models for a specific make
   - Example: `GET /api/vehicles/models?make=honda`

4. **Get Models for Make and Year**
   - Endpoint: `/vehicles/GetModelsForMakeYear/make/{make}/modelyear/{year}?format=json`
   - Description: Get models filtered by make and year
   - Example: `GET /api/vehicles/models?make=honda&year=2015`

## Integration Details

### VIN Lookup Flow

1. **Primary:** NHTSA decodes VIN → Returns comprehensive vehicle data
2. **Secondary:** Auto.dev fetches photos → Returns vehicle photos
3. **Combined:** Both data sources merged into single response

### Response Format

```json
{
  "success": true,
  "data": {
    "vin": "5UXWX7C5*BA",
    "year": 2011,
    "make": "BMW",
    "model": "X5",
    "trim": "xDrive35i",
    "bodyType": "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)",
    "driveType": "All Wheel Drive",
    "transmission": "Automatic",
    "engine": {
      "cylinders": 6,
      "displacement": 3.0,
      "fuelType": "Gasoline",
      "horsepower": 300
    },
    "raw": {
      "Make": "BMW",
      "Model": "X5",
      "Model Year": "2011",
      ...
    }
  },
  "photos": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ]
}
```

## Features

### 1. VIN Decoding
- Uses NHTSA DecodeVINExtended endpoint
- Returns comprehensive vehicle specifications
- Includes engine, transmission, body type, and more
- Optional `modelyear` parameter for better accuracy

### 2. Make/Model Lookup
- Get all makes from NHTSA database
- Get models for specific make
- Filter models by year and vehicle type
- Useful for form autocomplete and validation

### 3. Combined with Auto.dev
- NHTSA provides vehicle data
- Auto.dev provides professional photos
- Best of both worlds

## Usage

### VIN Lookup
```bash
# Basic lookup
curl "http://localhost:3000/api/vehicles/vin-lookup?vin=5UXWX7C5*BA"

# With model year for better accuracy
curl "http://localhost:3000/api/vehicles/vin-lookup?vin=5UXWX7C5*BA&modelyear=2011"
```

### Get All Makes
```bash
curl "http://localhost:3000/api/vehicles/makes"
```

### Get Models
```bash
# All models for a make
curl "http://localhost:3000/api/vehicles/models?make=honda"

# Models for make and year
curl "http://localhost:3000/api/vehicles/models?make=honda&year=2015"

# Models for make, year, and type
curl "http://localhost:3000/api/vehicles/models?make=honda&year=2015&type=truck"
```

## Error Handling

- **Invalid VIN format:** Returns 400 error
- **VIN not found:** Returns 404 error
- **NHTSA API errors:** Logged and user-friendly error message shown
- **Auto.dev photos optional:** If Auto.dev fails, VIN data still returned

## Advantages of NHTSA

1. **Free:** No API key or subscription required
2. **Comprehensive:** Extensive vehicle data and specifications
3. **Reliable:** Government-maintained database
4. **Fast:** Public API with good response times
5. **Accurate:** Official vehicle identification data

## Code Structure

- **`lib/api/nhtsa.ts`** - NHTSA API client functions
- **`app/api/vehicles/vin-lookup/route.ts`** - VIN lookup endpoint (uses NHTSA + Auto.dev)
- **`app/api/vehicles/makes/route.ts`** - Makes lookup endpoint
- **`app/api/vehicles/models/route.ts`** - Models lookup endpoint

## Testing

Test the integration with known VINs:
```bash
# Example: 2011 BMW X5
curl "http://localhost:3000/api/vehicles/vin-lookup?vin=5UXWX7C5*BA&modelyear=2011"
```

## Notes

- NHTSA API is rate-limited (check current limits)
- Some VINs may return partial data
- Model year parameter improves accuracy for older vehicles
- Auto.dev photos are fetched separately and may not always be available
