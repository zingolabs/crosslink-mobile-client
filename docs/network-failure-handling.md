# Network failures must not blank the UI

The Staking tab sometimes renders as a black screen when the indexer server is
unstable or the network is stale. Root causes and the fix plan live here.

## Root causes

1. **Native tab switch is instant, React commit is not.** The tab bar is a
   native control (`createNativeBottomTabNavigator`). The OS switches to the
   newly selected tab page immediately; the screen content is rendered by React
   afterwards. If the JS thread is busy, the page stays empty. The app theme is
   dark, so an empty page reads as a black screen.
2. **Every failed fetch re-renders the whole app.** `setLastError` had no
   equality check and was called by every failing RPC several times per polling
   cycle. Each call re-rendered the `Session` component and, with it, the entire
   navigator subtree.
3. **`latestBlock` alternated between a real height and 0.** On an info fetch
   failure the app wrote `latestBlock: 0`. The next successful poll wrote the
   real height again. Every change ran `stakingDayCalculation`, which read the
   scheduled-actions file, called up to four notifee bridge methods, and set
   state again. A flapping server kept this loop running. It also made the app
   report an active staking day while offline.
4. **No error boundary anywhere.** Any render exception unmounted the whole
   React tree with no recovery path.
5. **Unbounded reporting.** `report()` sent one POST per failure with no
   deduplication or rate limit, through the same failing network.

## Fix plan

### Phase 1 — minimal fixes to current code

- `setLastError` skips unchanged values, for both state and reporting.
- `report()` deduplicates by message within a window, rate limits (10/minute,
  100/session), and keeps a persisted queue flushed every 60 seconds and on
  app foreground. A failed send stops the flush until the next attempt.
- `fetchInfoAndServerHeight` keeps the last known good `info` on failure and
  sets `serverUnreachable` instead of writing zeroes.
- `scheduleReminder` skips when the rounded fire time and action count are
  unchanged.

### Phase 2 — remove the class components

- `Session.tsx` becomes `SessionStateProvider` (one `useReducer` per domain
  group) plus a memoized `SessionNavigator` that receives no state props.
- The 16 constructor-injected setters become `dispatch` functions.
- The `componentDidUpdate` block watcher is replaced by an event from
  `WalletService`, subscribed in an effect with cleanup.
- Transaction callbacks move to an actions domain context.
- `Opening.tsx` and `Setup.tsx` convert to function components.
- `WalletService` stays a class; it is a service, not a component.

### Phase 3 — staleness handling

- `serverUnreachable` and last-known-good timestamps let the UI show stale data
  as stale.
- Failed fetches write nothing to wallet-data state; only successful fetches
  mutate it.
- `configure()` runs its fetches concurrently with individual timeouts; the
  5-second interval restarts independently of the chain.

### Phase 4 — tab switch rendering

- The Staking screen's first commit renders static chrome only; lists and
  lifehash rendering mount afterwards.
- An automated test runs the app with simulated RPC failures at 100% and
  requires the Staking tab to commit within 2 frames.

## Verification

- Unit: error deduplication, report rate limiting, staleness flags, reminder
  skip condition.
- Integration: RPC fails N times then succeeds; `latestBlock` preserved,
  `stakingDay` unchanged, reminder scheduled once.
- Manual: airplane mode, dead server, 500 responses, unreliable proxy; cold
  start and foreground; both tabs.
