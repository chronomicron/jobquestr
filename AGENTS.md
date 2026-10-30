# JobQuestR data preparation instructions

Use this guide when helping someone prepare their own job-search data for the JobQuestR map. Treat their files as private personal data. The map accepts a local JSON file; it does not need the original spreadsheets or documents in the website repository.

## Privacy and source files

- Read only files the user has provided or explicitly selected for this task.
- Keep the original spreadsheets, Markdown files, PDFs, and emails unchanged.
- Do not copy source records, resumes, contact details, or generated personal JSON into tracked website files or the public GitHub repository.
- Write the finished map data to `data/private/jobquestr.json`. This folder is ignored by Git and is not included in the GitHub Pages deployment.
- Do not send the user's files to a geocoding service, company site, or other external service. Use data already provided by the user unless they ask for external research.
- Do not extract resume phone numbers, home addresses, or other identity details for the map. They are not needed to plot employers.
- If a user is working with a browser-only AI assistant, explain that attaching a file sends a copy to that AI service. Ask them to select only the source files needed and avoid attaching resumes or other sensitive documents unless they are comfortable sharing them with that service.

## Browser-only AI workflow

Assume the user may be using ChatGPT Free in a web browser without a coding workspace or access to their computer's folders. Do not claim you can read, edit, or save files directly on their computer. Users can attach supported spreadsheets and documents or paste relevant text into the chat. If the `.md` guide or source file cannot be attached, have them paste its contents or provide a plain-text copy.

For this workflow:

1. If the user is creating their data, use the selected source material. If they are updating existing map data, ask them to attach or paste the current `jobquestr.json` too; do not assume access to files that were not provided in the chat.
2. Prepare one complete, valid JSON document as the default output. If the chat offers file creation, provide it as a `.json` download. Otherwise, put the entire JSON document in one `json` code block so the user can copy it into a text editor and save it as `jobquestr.json`.
3. For updates, merge into the supplied JSON and return the complete replacement document. Do not tell the user to paste a new company object after the final `}`: JSON does not support appending records that way. If the full document is too large to return, provide only the specific company object(s) to insert or replace, identify the exact location inside the `companies` array, and explain any required comma.
4. Tell the user to save the result locally, then use JobQuestR's **Load Data** button to select it. Never ask them to paste personal JSON into the public website or commit it to the repository.

When giving a browser-only workflow, distinguish clearly between a downloadable output and a file saved directly into the user's project. ChatGPT's browser chat can analyze attached files and return content or downloadable files, but it does not thereby gain direct access to arbitrary folders on the user's computer.

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
  "origin": { "label": "Nearby transit stop", "coordinates": [-73.57, 45.50] },
  "companies": [
    {
      "id": "stable-company-id",
      "name": "Company name",
      "sector": "Industry, if known",
      "website": "https://example.com",
      "photoUrl": "https://example.com/office-front.jpg",
      "photoAttribution": "Photo credit, if required by the source",
      "logoUrl": "https://example.com/logo.svg",
      "glassdoorUrl": "",
      "streetViewUrl": "",
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
          "jobDescription": "A concise description from the source posting",
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
- When you have a coding workspace with authorized access to the project, save the result to `data/private/jobquestr.json` and report the path. If you do not have that access, follow the browser-only workflow above; return a downloadable `.json` file if available, otherwise valid JSON content, and tell the user how to save it. Do not claim you created a local file you could not access.

## Prompt for a browser-only AI assistant

The user can paste this guide into the chat or attach a plain-text copy, then attach selected source files and, when updating, their current JSON. They can ask:

> I use JobQuestR. Follow the data-preparation guide below and inspect only the files I attach or text I paste. Keep my source files unchanged. Group submitted roles under one company, preserve supported facts, and flag missing or uncertain details rather than guessing. Keep personal data private. If I attached an existing `jobquestr.json`, merge into it and return the complete updated document. Otherwise create a new complete document. Return one valid JSON document as a downloadable `.json` file if available; if not, put the entire JSON in one `json` code block. Do not claim you saved anything to my computer. I will save the result locally and select it with JobQuestR's **Load Data** button. List records or locations that need my review.

Then paste or attach this `AGENTS.md` guide and provide the source material. If the complete JSON is too large to return in one response, ask the assistant for company-object snippets with exact insertion instructions rather than copying a partial JSON document as if it were complete.

## Prompt for an assistant with workspace access

When the assistant actually has authorized access to the user's project folder, they can use:

> Follow `AGENTS.md` to prepare my JobQuestR data. Inspect only the files I provided, preserve them unchanged, group submitted roles by employer, and create or update `data/private/jobquestr.json`. Keep personal information private. Do not publish or commit the JSON. Use approximate pins only when I approve them, and list any records or locations that need my review. If you do not have access to my project folder, use the browser-only workflow instead.
