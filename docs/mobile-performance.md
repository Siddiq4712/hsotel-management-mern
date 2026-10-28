# Mobile performance

Student transaction, mess-bill and food-order histories request 20 rows per page. The server caps page size at 100, sorts with an ID tie-breaker, and returns `pagination` metadata. Transactions and bills also return aggregate statistics across the complete active filter. Requests without `page` or `pageSize` retain the existing complete-array response for web callers.

The mobile histories include Load more, pull-to-refresh and retry. Changing filters resets the history; responses from old filters or unmounted screens are ignored. Food date pickers are drafts until Search is pressed. Reset clears the applied query immediately.

Dashboard reads use a 30-second, session-memory cache capped at 64 entries. Requests with matching paths and parameters share an in-flight request. Account/token changes, authorization failures and write requests clear it; responses started before invalidation cannot refill it. Dashboard refresh controls bypass cached results. Operational approval, ordering and scanning APIs remain uncached. The Student, Warden, Parent and Security dashboards opt in; a parent's selected student is included in the cache key.

Long lists use variable-height virtualization so text-size preferences continue to work. The Warden GPS countdown updates locally, and GPS/food timers and the scanner pause outside the foreground screen.

## Checks

Run from the respective folders:

```powershell
# backend
node --test scripts/mobile-pagination.test.mjs

# mobile-app
npm run test:performance
node --test scripts/additional-food.test.mjs scripts/request-details.test.mjs scripts/text-size.test.mjs
npx expo export --platform android --output-dir .expo/performance-check
```

## Android validation

For Expo Go with development mode disabled:

```powershell
npm run start:production
```

For a local native release build (Android SDK and a compatible JDK are required):

```powershell
npm run android:release
```

The generated native project's default release configuration uses a debug signing key; it is suitable for local performance checks, not store distribution. Configure an owned production signing key before shipping. No production signing credentials or publishing configuration were added.

The user approved a local release-testing HTTP exception for `192.168.1.5`. The `withApiNetworkSecurity` Expo plugin generates a domain-specific Android policy for that IP only; other HTTP hosts are rejected and HTTPS uses Android's normal network security policy. Switching to a different HTTP host requires a new explicit decision.

Capture native frame and memory statistics while exercising realistic large histories:

```powershell
.\scripts\android-performance.ps1 -Seconds 30
# For Expo Go instead of the standalone app:
.\scripts\android-performance.ps1 -Package host.exp.exponent -Seconds 30
```

Reports are saved in `.expo/performance-reports/`. These measure Android rendering and memory, not JavaScript FPS. Compare the same device, build mode, dataset and interactions. A bundle export or emulator sample does not establish physical-phone performance.

## Current verification

### Bottom-tab repeat-switch follow-up

Returning to Student Home keeps the existing expense chart mounted when the selected year and values are unchanged. `expenseChartData.js` retains the chart's data reference so its memoized SVG does not redraw on an identical cached response. Profile re-entry shares the session dashboard cache. Loaded Parent, Warden and Security content is retained during automatic background refreshes, with unchanged cached data avoiding repeated list reconstruction.

`useAfterPaintFocusEffect.js` schedules automatic focus refreshes after two animation-frame callbacks, allowing the newly selected screen a paint opportunity before refresh-driven renders. Blur cancels scheduled work and runs any cleanup supplied by the focus effect. Manual refresh and submission handlers remain direct. The bottom-tab route-selection and permission logic is unchanged.

All 44 mobile checks passed for this follow-up, including chart reference reuse, changed values/year/labels, rapid tab cancellation and effect cleanup. Device timing remains unmeasured.

### Tap-response follow-up

Shared Android buttons, navigation controls, service selectors and Student Home quick actions use a native ripple through `Touchable.js`. Other platforms retain opacity feedback. Actions remain on `onPress`; no submit or navigation action is moved to touch-down. Existing disabled, loading, accessibility and permission props pass through.

All four role tab navigators freeze inactive screens. The API now reuses `sessionToken.js` instead of rereading AsyncStorage before every request. Concurrent cold reads share one storage request, while explicit login/logout overrides older reads. Authorization failures clear the memory token before asynchronous storage cleanup.

All 38 mobile checks and `.expo/tap-response-check` Android/Hermes export passed for this follow-up. No Android device was connected, so tap latency and visual behavior still require device verification. Reload Expo Go with `npm run start:production` to pick up these JavaScript changes.

### Earlier pagination/release verification

The optimization checks passed: 31 mobile tests, 17 backend tests, Android JavaScript/Hermes export, and read-only SQL checks of all three paginated endpoints using a nonexistent account. The approved HTTP policy was generated and its host restriction was checked.

The native release build installed its required SDK tools but failed inside native dependencies with long-path `mkdir` errors and `build.ninja still dirty after 100 tries`. This machine's SDK CMake 3.22.1 bundles Ninja 1.10.2, and Windows long-path support is disabled. The user chose to leave Windows settings unchanged. No standalone APK, installation, or physical-phone FPS result is claimed.

[Ninja's release notes](https://github.com/ninja-build/ninja/releases/tag/v1.12.0) document Windows long-path support starting with 1.12.0; [the Expo SDK 58 issue](https://github.com/expo/expo/issues/51861) discusses this build limitation. A native build needs a suitable short-path build environment or a separately approved toolchain/system change. Expo Go with development mode disabled remains available through `npm run start:production`.
