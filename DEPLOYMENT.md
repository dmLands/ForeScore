# ForeScore Deployment Guide

## Cache Invalidation and Version Management

ForeScore uses a multi-layered caching strategy to ensure users always get the latest version after deployment while maintaining optimal performance.

### Version Update Process

When deploying a new version, update the version number in **TWO PLACES**:

1. **Update `shared/version.ts` (line 8):**
   ```typescript
   export const APP_VERSION = '1.0.1'; // Increment version
   ```

2. **Update `client/public/sw.js` (line 6):**
   ```javascript
   const APP_VERSION = '1.0.1'; // Must match shared/version.ts
   ```

⚠️ **CRITICAL:** Both files must have **EXACTLY** the same version number for cache invalidation to work.

**Why two files?**
Service workers run in a separate context and cannot import ES modules. While not ideal, this two-file approach is the most reliable way to ensure cache invalidation works correctly given these constraints.

**Version Validation:**
The VersionChecker component will detect mismatches and prompt users to update, so if you forget to update one file, users will see the update prompt after deployment.

### How It Works

#### 1. Service Worker Strategy
- **Cache Name:** `forescore-v{VERSION}` - changes with each version
- **Install:** New service worker installs with updated cache name
- **Activate:** Deletes old caches, claims clients immediately
- **Update:** Uses `skipWaiting()` to activate without waiting for tabs to close

#### 2. HTTP Cache Headers
- **HTML Files:** `no-cache, no-store, must-revalidate` (always fresh)
- **Hashed Assets:** `max-age=31536000, immutable` (permanent cache)
- **Other Assets:** `max-age=3600, must-revalidate` (1 hour cache)

#### 3. Client-Side Detection
- **Version Checker:** Polls `/api/version` every 5 minutes
- **SW Messages:** Listens for service worker update notifications
- **User Prompt:** Shows "Update Available" banner when mismatch detected
- **One-Click Update:** User clicks "Update Now" → force reload → new version active

### Testing Updates

To test the update flow:

1. Deploy version 1.0.0
2. Open the app in browser
3. Update version to 1.0.1 in both files
4. Deploy version 1.0.1
5. Wait up to 5 minutes (or trigger manual refresh)
6. Update banner should appear
7. Click "Update Now"
8. App reloads with new version

### Deployment Checklist

Before deploying:
- [ ] Update `shared/version.ts` with new version number
- [ ] Update `client/public/sw.js` with same version number
- [ ] Test locally if possible
- [ ] Commit changes
- [ ] Deploy to production
- [ ] Verify version endpoint: `curl https://your-app.repl.co/api/version`
- [ ] Monitor for update banners appearing for users

### Cache Invalidation Guarantees

**What gets invalidated immediately:**
- HTML files (network-first, no cache)
- Service worker script (browser checks every 24h or on navigation)
- API responses (no cache)

**What stays cached:**
- Vite-hashed assets (e.g., `app-abc123.js`) until service worker updates
- Static images/fonts for 1 hour

**User Experience:**
- New deployments detected within 5 minutes
- One-click update with automatic reload
- No manual cache clearing needed
- Offline support maintained

### Troubleshooting

**Update not appearing?**
1. Check version numbers match in both files
2. Verify `/api/version` returns new version
3. Check service worker registered: DevTools > Application > Service Workers
4. Force service worker update: DevTools > Application > Update on reload

**Stale content showing?**
1. HTML should never be stale (network-first)
2. Check Cache-Control headers in network tab
3. Verify service worker is active
4. Clear site data: DevTools > Application > Clear storage

## Additional Notes

- Version number format is flexible (semantic versioning recommended)
- Service worker updates require HTTPS (or localhost)
- Update detection works even when app is open
- Cache invalidation works in production deployments on Replit
