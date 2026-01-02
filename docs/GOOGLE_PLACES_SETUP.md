# Google Places API Setup

## Overview

The application uses Google Places Autocomplete API to provide address validation and autocomplete functionality for all address input fields.

## Required Environment Variable

Add the following to your `.env.local` file:

```bash
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

## How to Get a Google Places API Key

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Create a new project or select an existing one
   - Note the project name for billing purposes

3. **Enable the Places API**
   - Navigate to **APIs & Services** > **Library**
   - Search for "Places API"
   - Click on "Places API"
   - Click **Enable**

4. **Create API Key**
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **API Key**
   - Copy the generated API key

5. **Restrict the API Key (Recommended for Production)**
   - Click on the API key to edit it
   - Under **API restrictions**, select "Restrict key"
   - Choose "Places API" from the list
   - Under **Application restrictions**, you can restrict by:
     - HTTP referrers (for web apps)
     - IP addresses (for server-side)
   - Click **Save**

## Features

The Google Places Autocomplete component provides:

- **Address Autocomplete**: Real-time address suggestions as users type
- **Address Validation**: Ensures addresses are valid and properly formatted
- **Standardized Format**: Returns addresses in a consistent format
- **Multiple Field Types**: Works with both text inputs and textareas

## Used In

The AddressInput component is used in the following forms:

1. **Onboarding Page** - User address field
2. **Dealer Verification** - Business address field
3. **Vehicle Forms** - Location field (new and edit)

## Pricing

Google Places API uses a pay-as-you-go pricing model:

- **Autocomplete (Per Session)**: $2.83 per 1,000 sessions
- First $200 in credits are free each month (for new Google Cloud customers)

For more details, visit: https://developers.google.com/maps/documentation/places/web-service/usage-and-billing

## Troubleshooting

### Autocomplete Not Working

1. **Check API Key**
   - Verify `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` is set in `.env.local`
   - Restart your development server after adding the key
   - Check browser console for API errors

2. **Check API Restrictions**
   - Ensure Places API is enabled in Google Cloud Console
   - Verify API key restrictions allow your domain/IP

3. **Check Billing**
   - Ensure billing is enabled for your Google Cloud project
   - Check that you haven't exceeded quota limits

### Browser Console Errors

- `Google Maps API error: RefererNotAllowedMapError` - Add your domain to API key restrictions
- `This API project is not authorized to use this API` - Enable Places API in Google Cloud Console
- `You have exceeded your request quota` - Check your usage and billing

## Security Notes

- The API key is prefixed with `NEXT_PUBLIC_` so it's exposed to the client
- Always restrict the API key by:
  - HTTP referrers (your domain)
  - API restrictions (only Places API)
- Never commit the API key to version control
- Use different keys for development and production
