# ForeScore iOS App - Build Package

This package contains everything needed to build the ForeScore iOS app for App Store submission.

## Package Contents

```
ios-package/
├── www/                    # Pre-built web app (ready for Capacitor)
│   ├── index.html
│   └── assets/
├── capacitor.config.json   # Capacitor configuration
├── package.json            # Minimal dependencies for iOS build
└── README.md               # This file
```

## App Information

- **App Name**: ForeScore
- **Bundle ID**: com.forescore.app
- **Version**: 1.0.0
- **Platform**: iOS 14.0+

## Build Instructions

### Option 1: Using Codemagic (Recommended - No Mac Required)

1. Create account at https://codemagic.io
2. Connect your Apple Developer account
3. Upload this package or connect to your repository
4. Configure the build:
   - Platform: iOS
   - Build type: Capacitor/Ionic
   - Web assets: Already built in `www/` folder
5. Codemagic will:
   - Install dependencies
   - Add iOS platform
   - Build and sign the IPA
   - Optionally submit to App Store Connect

### Option 2: Using Ionic Appflow

1. Create account at https://ionic.io/appflow
2. Upload this package
3. Configure iOS build with your signing credentials
4. Build and download the signed IPA

### Option 3: Local Build (Requires Mac + Xcode)

```bash
npm install
npx cap add ios
npx cap copy ios
npx cap open ios
```

In Xcode:
1. Set your Team under Signing and Capabilities
2. Update Bundle Identifier if needed
3. Product - Archive
4. Distribute App - App Store Connect

## Apple Developer Requirements

- Active Apple Developer Program membership ($99/year)
- App Store Connect app record created
- Signing certificates and provisioning profiles

## App Store Submission Checklist

- [ ] App icons (1024x1024 for App Store)
- [ ] Screenshots for required device sizes
- [ ] App description and keywords
- [ ] Privacy Policy URL (https://forescore.xyz/privacy)
- [ ] Terms of Service URL (https://forescore.xyz/terms)
- [ ] Support URL
- [ ] Age rating questionnaire completed

## Important Notes

1. **No In-App Payments**: This app deliberately excludes payment UI per Apple guidelines. Users are directed to forescore.xyz for subscription management.

2. **WebView App**: The app wraps the ForeScore web app. Apple reviews these carefully - ensure you have unique native value or functionality.

3. **Privacy**: The app requires internet access. Update Info.plist usage descriptions as needed.

## Support

For build issues: Contact your development team
For app issues: support@forescore.xyz
