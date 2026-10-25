# Dynamic Island setup (StakingDayWidget)

The `StakingDayWidgetExtension` target is already wired into
`ZingoDelegator.xcodeproj` (hand-edited `project.pbxproj`). This document
records what the wiring consists of, so it can be reproduced manually in
Xcode if the project is ever regenerated.

## Targets

- `ZingoDelegator` (app) — includes:
  - `ios/StakingDayActivityAttributes.swift` (also compiled into the widget)
  - `ios/StakingDayActivityModule.swift`
  - `ios/StakingDayActivityBridge.m`
- `StakingDayWidgetExtension` (widget, `com.apple.product-type.app-extension`):
  - `ios/StakingDayWidget/StakingDayWidgetLiveActivity.swift`
  - `ios/StakingDayActivityAttributes.swift`
  - `ios/StakingDayWidget/Info.plist`
    (`NSExtensionPointIdentifier` = `com.apple.widgetkit-extension`)

## Manual Xcode steps (equivalent)

1. File > New > Target > Widget Extension, name `StakingDayWidget`,
   uncheck "Include Configuration App Intent". Bundle identifier must be
   `org.ZingoLabs.ZingoDelegator.StakingDayWidget` (prefixed by the app's).
2. Set the widget target's iOS deployment target to 16.1, Swift language
   version 5.0, `MARKETING_VERSION` 0.0.1 and `CURRENT_PROJECT_VERSION` 38
   (must match the app for embedding).
3. Add `ios/StakingDayActivityAttributes.swift` to **both** targets
   (Target Membership in the File Inspector).
4. Add `StakingDayActivityModule.swift` + `StakingDayActivityBridge.m` to the
   app target only.
5. App target > General > Frameworks, Libraries: nothing extra needed
   (ActivityKit is weak auto-linked via `import ActivityKit`).
6. App target > Build Phases > New Copy Files Phase, destination "PlugIns",
   name it "Embed App Extensions", add `StakingDayWidgetExtension.appex` with
   "Code Sign On Copy".
7. App target > Dependencies: add `StakingDayWidgetExtension`.
8. `ios/ZingoDelegator/Info.plist`: add `NSSupportsLiveActivities = YES`.

## Runtime notes

- JS entry point: `app/StakingDayActivity.ts`
  (`StakingDayActivitySync` mounted in `LoadedApp.tsx`).
- The countdown ticks natively with `Text(timerInterval:)`; JS only pushes
  state changes (staking day flips / recomputed target date) via
  `startActivity` / `updateActivity`.
- Live Activities run only while the app is open; no background updates or
  push tokens are used.
