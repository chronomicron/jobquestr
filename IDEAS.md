# JobQuestR ideas

Working project name: **JobQuestR**.

A parking lot for useful features to consider after the first version is working. These are ideas, not commitments for the initial build.

## Nice to have

- Search and filter company pins by application status, location, or deadline.
- Saved views such as “interviews this week” or “waiting to hear back.”
- A “Today” view on opening the site, highlighting interviews, follow-ups, deadlines, and other dated tasks (for example, reminding you to follow up with a company).
- A per-application checklist for steps such as sending a resume, asking for a referral, and completing an interview.
- A way to mark priority applications and keep them easy to find.
- A notes area for application-specific notes.
- Remember a user's selected job-search folder or workbook so the map can reconnect to local data on later visits, subject to browser support and permission prompts.
- Support an empty starter workbook or template that users can fill with their own job-search data.
- Allow the commute departure time to be adjusted from the typical weekday morning default.
- Keep the data format and setup adaptable for a possible reusable or open-source version, with guidance for Codex on adapting a user's Excel and Markdown files.

## Visual direction

- For the first personal version, use a neon cyberpunk / Matrix-inspired look. Keep the Montréal-area map readable, with a dark base, neon accents, luminous company pins and transit routes, and matching futuristic information cards.
- If the project later becomes reusable, leave room for other users to adjust or replace the visual theme.

## Dashboard and navigation ideas

- Add top-level tabs for managing resumes and cover letters, including which versions were used for each company or role.
- On a company's corporate information card, optionally show Google Street View of the office entrance.
- Offer both public-transit and driving travel-time estimates to each company.
- Keep a top-level daily readout of recent activity and upcoming items, including tomorrow's interviews, follow-ups, and deadlines.
- Add a dedicated activity and statistics page showing what the user has done and job-search progress over time (for example, applications submitted, interviews, follow-ups, and outcomes).

## Theme preferences

- Support both dark and light modes; use dark mode as the initial default, retaining the 80s cyberpunk / synthwave styling.

## Map service setup

- Keep the map tile, Street View, and routing providers configurable where practical. A personal setup can choose the providers that fit the owner; a reusable version may ask each user to configure their own providers and credentials and follow the applicable service terms and attribution requirements.

## Initial platform scope

- Build the first version as a desktop web application, with the three-column map dashboard as the primary layout. Treat a dedicated mobile layout as a later phase.
- Customize the base map's colors, roads, water, labels, and neighborhood details to fit the neon cyberpunk theme; layer company pins and route lines above it.

## Future GPT-assisted setup

- For a future reusable version, provide a standard data format plus clear instructions or prompts so each person can use their own ChatGPT account to help prepare their Excel and Markdown files for the map. Treat this as an optional user-directed workflow, separate from the first personal desktop version.
