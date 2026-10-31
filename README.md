# MyMoney Casa

Private personal salary and investment-planning web app, with a Casablanca equities research screen and IPO/news feed.

## Deployment

The website source files are in the repository root; no build step is required. GitHub Pages requires a public repository on GitHub Free, or a qualifying paid plan for private repositories. Publishing the site makes its JavaScript, published market data, and news publicly accessible. Never commit actual salary records or private financial files.

For eligible GitHub Pages repos: Settings → Pages → Build and deployment → GitHub Actions (NOT Deploy from a branch). The included workflow deploys the website on pushes and after scheduled public-source refreshes. The resulting public address follows `https://<username>.github.io/<repository>/`. On an iPhone use Safari → Share → Add to Home Screen.

## New in V4 — Arabic, sync and Amazon KDP

- Switch the interface between English and Arabic (right-to-left) from the header or Settings. The choice is saved on your device.
- Tap **Sync** to fetch the latest **published** Casablanca stocks/IPO news snapshot. It does not fetch intraday quotes directly or synchronize your personal budget to the cloud.
- Open **KDP → Casablanca portfolio** to log royalty payouts and actual broker purchases. Enter the net Moroccan dirham amount manually; the app never assumes an EUR/MAD exchange rate. Market values are estimates from dated public snapshots, not broker confirmations.
- The fixed €100/month N26 allocation (70% FTSE All-World, 10% gold ETC, 15% short-term euro bonds, 5% Bitcoin) remains separate from KDP earnings and optional individual-stock learning purchases.
- The **Export backup** button now includes the KDP ledger along with your personal budget; use it regularly. Your private data is stored only in browser local storage.

## Updating quotes and news

A GitHub Actions scheduled workflow can update the data four times a day when workflows are permitted. The scraper is best-effort; websites can block it or change layout, and the initial dated snapshot remains visible on failure. Price data is **not real-time** and the 2-year performance ranking remains unavailable until verified historical closing prices are provided. The curated IPO list contains only regulatory notices and should be cross-checked with AMMC before acting.

## Personal finance data

Personal income, budget entries and investments are stored in the browser's local storage on the device, not in this GitHub repository. Changing browsers or clearing site data can delete entries. Use Settings → export backup and keep backups private. There is no server-side account sync, and no trading/bank-account integration.

Sources: https://casabourse.ma/screener/ and https://www.ammc.ma/
