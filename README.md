# JobQuestR

JobQuestR is a desktop-first, cyberpunk-styled job-search map for Greater Montréal.

## Run locally

This first version is a static HTML/CSS/JavaScript site. From this folder, start any local static web server (for example, `python -m http.server 8000`) and open `http://localhost:8000`.

## Local data import

The **Load Data** button reads a selected JSON file in the browser. The file is not uploaded by the app. The current page starts with clearly labeled sample data; it does not contain your job-search records.

For the local job-search snapshot, create the map's JSON file with:

```bash
python3 scripts/prepare_local_data.py
```

This reads the Markdown application log, keeps records with a submitted date, groups multiple roles under one company, and writes `data/private/jobquestr.json`. It leaves the source workbooks and Markdown files unchanged. Prospects that have not been applied to are excluded. Location overrides live in the ignored `data/private/location-overrides.json` file. Approximate pins are marked in the company card; confirm exact worksite addresses before using them for commute planning.

Then open the site, choose **Load Data**, and select `data/private/jobquestr.json`. The generated file and the location overrides are excluded from Git and from the GitHub Pages deployment.

The JSON file should have this general structure:

```json
{
  "label": "My local data",
  "companies": [
    {
      "id": "company-id",
      "name": "Company name",
      "sector": "Industry",
      "website": "https://example.com",
      "address": "Office address",
      "glassdoorUrl": "https://www.glassdoor.com/",
      "coordinates": [-73.57, 45.50],
      "applications": [
        {
          "role": "Job title",
          "status": "Applied",
          "appliedAt": "2026-10-01",
          "nextAction": "Follow up next week",
          "events": [
            { "date": "2026-10-01", "time": "10:00", "type": "Applied", "title": "Application submitted", "detail": "Job title · Company name" }
          ]
        }
      ]
    }
  ]
}
```

Coordinates use `[longitude, latitude]`. Company records without coordinates can still be imported but will not get a map pin. The application Markdown log is the source for submitted roles; the Excel workbooks are used as supplemental job-browse and employer-watchlist information.

## Use with your own data and AI assistant

`AGENTS.md` is the reusable guide for preparing another person's data. They can give that file and their selected job-search sources to an AI assistant and ask it to create a private JSON file in the format above. The assistant should leave the originals unchanged and keep the resulting JSON out of the public repository. Then they can use **Load Data** to open their own file in the website. This is a separate data-preparation step; the website does not connect to or require a ChatGPT account.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes only `index.html` and `src/` from the `main` branch. It deliberately does not deploy the repository root, which keeps the local snapshot and other project notes out of the published artifact.

After the first push, open **Settings → Pages** in the GitHub repository and set **Build and deployment → Source** to **GitHub Actions**. The site URL will be `https://chronomicron.github.io/jobquestr/`.

Never commit `data/source_snapshot/`, `data/private/`, `data/generated/`, local credentials, or personal application files. GitHub Pages is public.

## Map services

The site uses MapLibre GL JS to render a dark vector map from OpenFreeMap. The visible map attribution is included in the map controls. The site also loads its typefaces from Google Fonts.
