# Delegator site

Releases are fetched from the GitHub API at build time (`api.github.com/repos/zingolabs/crosslink-mobile-client/releases`, newest first, drafts skipped). Android links use the release's `.apk` asset. iOS falls back to the release page when no iOS asset exists. Rebuild/redeploy to refresh. Ff the API is unreachable the page falls back to a single entry pointing at the releases page.

```
npm install
npm run dev
```

Build: `npm run build`, output in `dist/`.
