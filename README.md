# JobQuestR

JobQuestR is a desktop-first, cyberpunk-styled job-search map for Greater Montréal.

## Run locally

This first version is a static HTML/CSS/JavaScript site. From this folder, start any local static web server (for example, `python -m http.server 8000`) and open `http://localhost:8000`.

## Local data import

The **Load Data** button reads a selected JSON file in the browser. In browsers that support the File System Access API, selecting a file remembers a local file handle in browser storage and reloads its contents on later visits while permission remains available. If permission needs renewing, click **Load Data** to reconnect. Other browsers can still load JSON with the standard file picker but may require selecting it again on each visit. The app does not upload the file. Use **Forget** to remove the remembered handle from this browser; this does not delete your file. The current page starts with clearly labeled sample data; it does not contain your job-search records.

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
  "origin": { "label": "Nearby metro station", "coordinates": [-73.57, 45.50] },
  "companies": [
    {
      "id": "company-id",
      "name": "Company name",
      "sector": "Industry",
      "website": "https://example.com",
      "photoUrl": "https://example.com/office-front.jpg",
      "photoAttribution": "Photo credit, if required by the source",
      "logoUrl": "https://example.com/logo.svg",
      "address": "Office address",
      "glassdoorUrl": "https://www.glassdoor.com/",
      "streetViewUrl": "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=45.50%2C-73.57",
      "coordinates": [-73.57, 45.50],
      "applications": [
        {
          "role": "Job title",
          "status": "Applied",
          "appliedAt": "2026-10-01",
          "jobDescription": "A short description from the original posting.",
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

Coordinates use `[longitude, latitude]`. Set the optional `origin` by clicking **Your Start**, then clicking a spot on the map; the house marker can be clicked or moved later. The selected point is saved in this browser's local storage and can also be included in the local JSON file. Choose a convenient transit stop rather than a home address if you prefer not to mark your home. Company records without coordinates can still be imported but will not get a map pin. The application Markdown log is the source for submitted roles; the Excel workbooks are used as supplemental job-browse and employer-watchlist information.

Each company card links to a Glassdoor search for that company unless `glassdoorUrl` contains a direct profile URL. A `photoUrl` displays an office or front-door photo at the top of the card, with `logoUrl` used as a fallback; `photoAttribution` can display any required photo credit. The current version displays a supplied photo URL but does not automatically look up Google place photos. Automatic lookup would need Places API setup, including a Google Cloud API key and billing account ([Place Photos documentation](https://developers.google.com/maps/documentation/places/web-service/place-photos), [Places API billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing/)). A `streetViewUrl` opens a supplied Street View panorama; without one, the card links to a Google Maps search for the company and location. Each application can include a `jobDescription` field, which is shown in the lower panel when supplied.

## Use with your own data and AI assistant

`AGENTS.md` is the reusable guide for preparing another person's data. It includes a browser-only workflow: attach supported source files or paste relevant text, ask the assistant to return one complete JSON document, then save or download it locally and select it with **Load Data**. When updating existing data, provide the current JSON too. This workflow does not assume the assistant can write into the user's folders. A coding assistant with authorized workspace access can instead save the JSON directly into the ignored `data/private/` folder. In either case, leave source files unchanged and keep personal JSON out of the public repository. JobQuestR does not connect to or require a ChatGPT account.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes only `index.html` and `src/` from the `main` branch. It deliberately does not deploy the repository root, which keeps the local snapshot and other project notes out of the published artifact.

After the first push, open **Settings → Pages** in the GitHub repository and set **Build and deployment → Source** to **GitHub Actions**. The site URL will be `https://chronomicron.github.io/jobquestr/`.

Never commit `data/source_snapshot/`, `data/private/`, `data/generated/`, local credentials, or personal application files. GitHub Pages is public.

## Map services

The site uses MapLibre GL JS to render a dark vector map from OpenFreeMap. The visible map attribution is included in the map controls. The site also loads its typefaces from Google Fonts.

Origin lookup asks for a nearby bus stop, metro station, or intersection rather than a home address. It uses Photon’s public OpenStreetMap-based geocoder, which asks for reasonable request volume and may throttle or change availability. The submitted search is sent to Photon; the selected stop and coordinates are saved only in this browser. Use **Pick on map** to avoid sending a search to a lookup service.

Statcounter analytics runs on `chronomicron.com`, `www.chronomicron.com`, and `chronomicron.github.io` to measure public-site traffic. It does not run on `localhost` during development.
