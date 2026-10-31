# MyMoney Casa

Private personal salary and investment-planning web app, with a Casablanca equities research screen and IPO/news feed.

## Deployment

The website source files are in the repository root; no build step is required. GitHub Pages requires a public repository on GitHub Free, or a qualifying paid plan for private repositories. Publishing the site makes its JavaScript, published market data, and news publicly accessible. Never commit actual salary records or private financial files.

For eligible GitHub Pages repos: Settings → Pages → Deploy from a branch → main → /(root). The resulting public address follows `https://<username>.github.io/<repository>/`. On an iPhone use Safari → Share → Add to Home Screen.

## Updating quotes and news

A GitHub Actions scheduled workflow can update the data four times a day when workflows are permitted. The scraper is best-effort; websites can block it or change layout, and the initial dated snapshot remains visible on failure. Price data is **not real-time** and the 2-year performance ranking remains unavailable until verified historical closing prices are provided. The curated IPO list contains only regulatory notices and should be cross-checked with AMMC before acting.

## Personal finance data

Personal income, budget entries and investments are stored in the browser's local storage on the device, not in this GitHub repository. Changing browsers or clearing site data can delete entries. Use Settings → export backup and keep backups private. There is no server-side account sync, and no trading/bank-account integration.

Sources: https://casabourse.ma/screener/ and https://www.ammc.ma/
