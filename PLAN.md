# JobQuestR V0.1 plan

Working name: **JobQuestR** (GitHub repository slug: `jobquestr`).

## Goal

Build a desktop-first, locally useful job-search dashboard for the Montreal metropolitan area. The first release should turn the current job-search records into an interactive map and a clear application overview.

## V0.1 scope

- Dark cyberpunk / 1980s synthwave theme by default, with a light-mode option.
- Three-column desktop layout: company and application details on the left, interactive Montreal-area map in the center, and activity timeline on the right.
- One map pin per company; multiple applications at the same company appear together in its details.
- Company card with name, website, address, and a link to its Glassdoor page when available.
- Expandable “My Application” section with role, application date, status, notes, and links to relevant local documents.
- Top “Today” summary for recent activity and upcoming interviews, follow-ups, and deadlines.
- Basic search and status filtering if the data mapping supports them cleanly.
- Map pins and route lines styled to fit the visual theme, while keeping roads and place names legible.

## Data plan

1. Keep `data/source_snapshot/` as the untouched starting copy of the source spreadsheets, Markdown notes, and base resumes.
2. Treat the application tracker as the source for application status and dates, the company database as a source for office addresses, and the job-browse sheet as a source for prospective roles.
3. Map those source fields to a small canonical data structure: companies, applications, events, documents, and locations. Group applications under a company ID.
4. Resolve which locations are actual offices and add coordinates. Do not assume a generic company address is the correct worksite when the records are ambiguous.
5. For V0.1, create an app-ready local data file from the snapshot. Keep that generated personal data outside the published site and out of Git commits. The first app can load that local file through a file picker; remembering the folder can be added where browser support allows.
6. Preserve the original copied files; make conversions or corrections in separate derived files.

## Technical approach

- Build a static HTML, CSS, and JavaScript frontend that can run locally and publish directly through GitHub Pages.
- Use MapLibre GL JS for the map renderer and company markers.
- Start with OpenFreeMap's dark vector style and confirm its terms and attribution before deployment. Keep the map style/provider configurable where practical.
- Build the company card, timeline, tabs, theme switch, and controls as ordinary frontend components around the map.
- Keep V0.1 read-only with respect to the source spreadsheets. Application edits and Excel write-back can be planned after the initial view works.

## Hosting and privacy

- Initial host: GitHub Pages using a GitHub Actions build/deploy workflow. Keep the app portable so it can move to Cloudflare Pages later.

- Use GitHub Pages to publish the static application shell and its public code. GitHub Pages is a static host; it does not provide a private backend for this version.
- Assume the published page is publicly reachable. Never commit personal workbooks, Markdown job-search notes, resumes, generated personal JSON, API secrets, or private origin coordinates.
- Add a `.gitignore` for the snapshot, private/generated data, and local secrets before creating or pushing a Git repository.
- Load the user's selected data in the browser. Keep it client-side unless a separately designed feature explicitly sends selected information to an external service.
- Use VS Code to manage the local project, and Git commits/pushes to publish code changes to GitHub Pages. The deployment workflow copies only the public app files into its artifact.

## Milestones

1. **Data audit:** map source columns, separate applied roles from prospects, identify duplicate companies, and flag missing or ambiguous office locations.
2. **Data preparation:** define the canonical JSON format and generate a local first dataset from the snapshot, preserving source files.
3. **Visual shell:** create the desktop dashboard with placeholder data and the chosen theme.
4. **Interactive map:** add Montreal-area basemap, company pins, selection behavior, and the company/application panels.
5. **Activity view:** connect application events and add the top “Today” summary and timeline.
6. **Local data loading:** load the generated personal data file in the browser without publishing it.
7. **Publish:** initialize a Git repository, add privacy-focused ignore rules, create a GitHub repository, and deploy the static site to GitHub Pages after checking the deploy contents.

## Later features (outside V0.1 unless straightforward)

- Embedded Google Street View and live public-transit/driving travel-time calculations.
- Activity and statistics page, resume/cover-letter management tabs, saved views, checklists, priority applications, richer note editing, and AI assistance.
- A dedicated mobile layout and a reusable/open-source setup for other people's files and providers.

## Deployment note

GitHub Pages is available on GitHub Free for public repositories, and GitHub documents that Pages sites are publicly accessible even when the source repository is private on plans where that is allowed. A public code repository and public app shell can work for this project if all personal data remains outside the repository and deployed assets.
