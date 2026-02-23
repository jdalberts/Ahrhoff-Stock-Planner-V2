# AgriStock Pro — Changelog (All Fixes Applied)

## 🚨 Critical Bugs Fixed

### 1. OrderPlan.tsx — Broken syntax that crashed the page
- **Removed** stray `+` characters and `// COMMENT` text that were sitting inside the rendered JSX
- These were leftover diff/merge markers that would cause compile errors or render as visible garbage text
- **Lines affected:** 103-104, 147

### 2. App.tsx — Infinite re-render loop 
- **Problem:** The `useEffect` for alert detection had `alerts` in its dependency array, but also called `setAlerts()` inside — causing an infinite loop
- **Fix:** Used `useRef` to track the latest alerts without triggering re-renders. Removed `alerts` from the dependency array.

### 3. OrderPlan.tsx — CSV export broke with commas in data
- **Problem:** Item names containing commas (e.g. "Fertilizer, Grade A") would corrupt the CSV
- **Fix:** All text values are now wrapped in double quotes
- **Bonus:** Also cleans up the temporary DOM link element after download

---

## ⚠️ Significant Issues Fixed

### 4. App.tsx — Debug code removed from production
- Removed `runAlertDebug()` function
- Removed `(window as any).__runAlertDebug` exposure
- Removed visible "Debug Alerts" button from mobile header

### 5. db.ts — Database connection now cached
- **Before:** Every single `getAll()`, `put()`, or `delete()` opened a brand new IndexedDB connection
- **After:** Connection is opened once and reused. On failure, it resets so the next call retries.

### 6. All pages — Replaced browser `alert()`/`confirm()` with inline messages
- **Alerts.tsx:** Webhook success/failure now shows inline toast
- **StockTake.tsx:** Validation errors and success now show inline messages
- **SettingsPage.tsx:** Backup export/import feedback now shows inline toast
- **Items.tsx:** Validation errors now show inline in the form
- **Inventory.tsx:** Validation errors now show inline in the modal

### 7. App.tsx — Added Error Boundary
- If any page component crashes, the app now shows a friendly error screen instead of going completely blank
- Error screen shows the error message and a "Reload App" button
- User's data remains safe in IndexedDB

### 8. Items.tsx, Inventory.tsx, StockTake.tsx — Added input validation
- Pack size must be > 0
- Lead time, MOQ, cost can't be negative
- Shelf life must be > 0
- Lot quantity must be >= 0
- All required fields are properly checked before saving
- HTML `min` attributes added to number inputs as an extra safety net

### 9. OrderPlan.tsx — Removed unused `AlertCircle` import
- Was importing `AlertCircle` from lucide-react but never using it

---

## 🔧 Best Practice Improvements

### 10. Dashboard.tsx, App.tsx — Fixed TypeScript `any` types
- `Card` component in Dashboard now has a proper `CardProps` interface
- `NavItem` in App.tsx now has a proper `NavItemProps` interface
- Form `onChange` handlers now use specific types instead of `as any`

### 11. Items.tsx, Inventory.tsx — Added loading/saving indicators
- Save buttons show "Saving..." and are disabled while the database write is in progress
- Prevents double-clicks from creating duplicate records

### 12. App.tsx — Tab selection persists across page refresh
- Active tab is saved to `localStorage`
- When you refresh the browser, you stay on the same page instead of resetting to Dashboard

### 13. Items.tsx — Removed unused `lots` prop
- The `Items` component was receiving a `lots` prop from App.tsx but never using it
- Removed from both the Props interface and the App.tsx call

### 14. SettingsPage.tsx — Cleans up object URL after backup export
- Added `URL.revokeObjectURL()` call to prevent memory leaks
- Reset file input after import so the same file can be re-selected

---

## Files Changed (9 of 16)

| File | Changes |
|------|---------|
| `App.tsx` | Infinite loop fix, error boundary, debug removal, tab persistence, proper types |
| `db.ts` | Connection caching |
| `pages/OrderPlan.tsx` | Broken JSX fix, CSV fix, unused import removal |
| `pages/Dashboard.tsx` | Proper TypeScript types |
| `pages/Items.tsx` | Validation, removed unused prop, loading state |
| `pages/Inventory.tsx` | Validation, inline errors, loading state |
| `pages/StockTake.tsx` | Inline messages, validation |
| `pages/Alerts.tsx` | Inline toast messages |
| `pages/SettingsPage.tsx` | Inline toast, memory leak fix |

## Files Unchanged (7 of 16)

| File | Reason |
|------|--------|
| `types.ts` | Already clean |
| `constants.ts` | Already clean |
| `calculations.ts` | Already clean |
| `index.tsx` | Already clean |
| `index.html` | No changes needed |
| `pages/SalesEntry.tsx` | No critical issues |
| `package.json` / `tsconfig.json` / `vite.config.ts` | Config files unchanged |

---

## Still Recommended (Not Done Yet)

These are bigger changes you may want to tackle later:

1. **Install Tailwind as build dependency** (remove CDN script tag)
2. **Add Service Worker** for true offline capability  
3. **Add React Context** to reduce prop drilling
4. **Add more test cases** for `detectAlerts()` and edge cases
5. **Build an Excel import feature** (coming next!)
