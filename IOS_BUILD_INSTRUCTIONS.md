# ForeScore iOS App Build Instructions

This guide explains how to build the ForeScore iOS app for Apple App Store submission.

## Overview

The iOS app is a WebView wrapper around the ForeScore web application, with the following key differences from the web version:

- **No In-App Payments**: Stripe checkout is disabled to comply with Apple's App Store guidelines
- **Web Subscription Management**: Users are directed to forescore.xyz to manage subscriptions
- **Legal Compliance**: Privacy Policy and Terms of Service links are accessible without login

## Prerequisites

1. **macOS** with Xcode 15+ installed
2. **Node.js 18+** installed
3. **Apple Developer Account** ($99/year)
4. **Capacitor CLI** installed globally: `npm install -g @capacitor/cli`

## Step 1: Install Capacitor Dependencies

```bash
npm install @capacitor/core @capacitor/ios @capacitor/cli
```

## Step 2: Build the Web App for iOS

Build the production web assets:

```bash
npm run build
```

This creates the `dist/public` directory with the production build.

## Step 3: Initialize iOS Platform

Add the iOS platform to Capacitor:

```bash
npx cap add ios
```

This creates the `ios/` directory with the Xcode project.

## Step 4: Configure iOS Project

### App Icons
Add your app icons to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

Required sizes:
- 1024x1024 (App Store)
- 180x180 (iPhone @3x)
- 120x120 (iPhone @2x)
- 167x167 (iPad Pro @2x)
- 152x152 (iPad @2x)
- 76x76 (iPad @1x)

### Splash Screen
Add splash screen images to `ios/App/App/Assets.xcassets/Splash.imageset/`

### Info.plist Updates
Open `ios/App/App/Info.plist` and add/update:

```xml
<key>CFBundleDisplayName</key>
<string>ForeScore</string>

<key>ITSAppUsesNonExemptEncryption</key>
<false/>

<key>NSCameraUsageDescription</key>
<string>ForeScore needs camera access for future features</string>
```

## Step 5: Build for App Store

1. Open the iOS project in Xcode:
```bash
npx cap open ios
```

2. In Xcode:
   - Select "Any iOS Device (arm64)" as the build target
   - Product → Archive
   - Wait for archive to complete
   - Window → Organizer
   - Select the archive → Distribute App
   - Choose "App Store Connect" → Upload

## Environment Configuration

### iOS-Specific Build

When building for iOS, set the environment variable:

```bash
VITE_PLATFORM=ios npm run build
```

This ensures:
- Stripe is not initialized (prevents errors)
- Payment UI shows "Manage on Web" prompts
- No price displays in the app

## Platform Detection

The app automatically detects when running in Capacitor native context:

```typescript
import { isNativeIOS, canShowPayments } from '@/lib/platform';

if (isNativeIOS()) {
  // Running in iOS app
}

if (canShowPayments()) {
  // Only true on web, not iOS
}
```

## Apple App Store Submission Checklist

### Required Information
- [ ] App Name: ForeScore
- [ ] Bundle ID: xyz.forescore.app
- [ ] Category: Sports
- [ ] Age Rating: 4+ (no objectionable content)
- [ ] Description (up to 4000 characters)
- [ ] Keywords (up to 100 characters)
- [ ] Screenshots for all device sizes
- [ ] App Preview video (optional)

### Required Assets
- [ ] App Icon (1024x1024, no transparency)
- [ ] Screenshots:
  - iPhone 6.7" (1290x2796 or 1284x2778)
  - iPhone 6.5" (1242x2688 or 1284x2778)
  - iPhone 5.5" (1242x2208)
  - iPad Pro 12.9" (2048x2732)
  - iPad Pro 11" (1668x2388)

### App Store Connect Setup
1. Create new app in App Store Connect
2. Fill in app information
3. Upload build from Xcode Organizer
4. Submit for review

### Common Review Issues to Avoid
1. **Payments**: Do NOT include any payment buttons or price displays
2. **Links**: All external links must work (Privacy Policy, Terms)
3. **Functionality**: App must work without crashing
4. **Content**: No placeholder or "Lorem ipsum" content
5. **Account Deletion**: Must provide way to delete account (email to support@forescore.xyz is acceptable)

## Testing

### Local Testing in Simulator
```bash
npx cap run ios
```

### Testing on Device
1. Connect iOS device via USB
2. In Xcode, select your device as target
3. Product → Run (Cmd+R)

## Syncing Changes

After making changes to web code:

```bash
npm run build
npx cap sync ios
```

Then rebuild in Xcode.

## Troubleshooting

### "Unable to install app"
- Check your Apple Developer certificate is valid
- Ensure device is registered in your developer account

### White screen on launch
- Check console logs in Xcode for errors
- Verify `webDir` in capacitor.config.json matches build output

### Stripe errors in console
- Ensure `VITE_PLATFORM=ios` is set during build
- Verify platform detection is working correctly

## Support

For questions about the iOS build process, contact: support@forescore.xyz
