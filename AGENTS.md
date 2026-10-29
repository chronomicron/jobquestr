# JobQuestR data preparation instructions

Use this guide when helping someone prepare their own job-search data for the JobQuestR map. Treat their files as private personal data. The map accepts a local JSON file; it does not need the original spreadsheets or documents in the website repository.

## Privacy and source files

- Read only files the user has provided or explicitly selected for this task.
- Keep the original spreadsheets, Markdown files, PDFs, and emails unchanged.
- Do not copy source records, resumes, contact details, or generated personal JSON into tracked website files or the public GitHub repository.
- Write the finished map data to `data/private/jobquestr.json`. This folder is ignored by Git and is not included in the GitHub Pages deployment.
- Do not send the user's files to a geocoding service, company site, or other external service. Use data already provided by the user unless they ask for external research.
- Do not extract resume phone numbers, home addresses, or other identity details for the map. They are not needed to plot employers.

## Prepare the records

1. Identify records the user wants on the map. By default, include submitted applications only. Keep unsubmitted leads out unless the user asks to map prospects too.
2. Group applications for the same employer under one company record. Keep each distinct role as its own application item.
3. Preserve the employer's name, role title, source status, application date, posting link, position or requisition ID, worksite text, and work mode when present.
4. Normalize status to one of `Applied`, `In review`, `Interview`, or `Not selected`. Preserve the source wording separately in `sourceStatus` so the normalization remains auditable.
5. Store dates as `YYYY-MM-DD`. If a date is missing or ambiguous, use `null`; never guess a year or day.
6. Do not invent company websites, Glassdoor links or ratings, worksite addresses, commute times, transit routes, salary details, application events, or coordinates.
7. Keep job worksite information on each application. The company-level map pin can use a confirmed local office address. If the source gives only a city or borough, use an approximate area pin only when the user approves it, label it as approximate, and explain the uncertainty in `locationNote`. Otherwise set `coordinates` to `null` and report that the location needs confirmation.
8. If source files disagree, preserve the distinct values and tell the user what needs review. Do not silently choose one.

## JSON format

Create a UTF-8 JSON object with a `companies` array. Coordinates are `[longitude, latitude]`, in that order. A company without known coordinates may use `null`; it will not appear as a map marker until coordinates are supplied.

```json
{
  "label": "My local job search",
  "companies": [
    {
      "id": "stable-company-id",
      "name": "Company name",
      "sector": "Industry, if known",
      "website": "https://example.com",
      "glassdoorUrl": "",
      "address": "Company office or approximate area",
      "locationPrecision": "exact",
      "locationNote": "",
      "coordinates": [-73.57, 45.50],
      "applications": [
        {
          "id": "stable-application-id",
          "role": "Job title",
          "status": "Applied",
          "sourceStatus": "Application submitted",
          "appliedAt": "2026-10-01",
          "location": "Worksite information from the source",
          "workMode": "Hybrid",
          "postingUrl": "https://example.com/job",
          "positionId": "REQ-123",
          "nextAction": "",
          "notes": "",
          "events": [
            {
              "date": "2026-10-01",
              "time": "",
              "type": "Applied",
              "title": "Application submitted",
              "detail": "Job title · Company name"
            }
          ]
        }
      ]
    }
  ]
}
```

Use `locationPrecision` values `exact`, `approximate`, or `unknown`. Optional values may be empty strings. Use `events: []` when there are no dated events supported by the source. Keep IDs stable across updates so records remain easy to compare.

## Check and load the result

- Validate that the JSON parses and that each company has a unique `id` and `name`.
- Confirm each application is under the intended company, has a supported status, and has a valid ISO date or `null`.
- Confirm coordinates contain two finite numbers in longitude/latitude order or are `null`.
- Report how many applications and companies were included, what was excluded, and which locations need confirmation.
- Do not overwrite an existing `data/private/jobquestr.json` without checking for user edits and preserving them.
- Tell the user to open JobQuestR, choose **Load Data**, and select their local JSON file. Do not commit or upload that file.
- If you cannot write to the user's project folder, return a downloadable JSON file or valid JSON content and tell the user where to save it. Do not claim you created a local file you could not access.

## Prompt for another AI assistant

The user can provide this file and their selected source files to their own assistant, then ask:

> Follow `AGENTS.md` to prepare my JobQuestR data. Inspect only the files I provided, preserve them unchanged, group submitted roles by employer, and create or update `data/private/jobquestr.json`. Keep personal information private. Do not publish or commit the JSON. Use approximate pins only when I approve them, and list any records or locations that need my review. If you cannot save to my project folder, give me a downloadable JSON file and tell me where to save it.
