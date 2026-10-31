# Bird Wanderer testing deliverables

Use `Bird_Wanderer_Testing_Phase_Report_Draft.docx` as the editable report for the revised five successful workflows and five substantial negative scenarios. It includes recreation steps, formal execution tables and screenshot placeholders. Fill in group details and record actual results after execution; its entries deliberately start as **Not run**.

`Bird_Wanderer_Evaluation_Companion.docx` and its PDF provide preparation, screenshot guidance, presentation notes and the revised G-P/G-N cases. Their substantial negative scenarios are interrupted publication, media persistence failure and cleanup, private-record access, attachment privacy revocation, and discovery failure/recovery.

The older `Bird_Wanderer_Test_Cases.docx` and PDF, `api-results.json`, and `run-demo.mjs` use the original **BW-P/BW-N** selection, including corrupt-photo, oversized-upload and date checks. Those are supporting examples, not the complete revised evaluation selection. `api-results.json` is a dated synthetic API execution record from 26 October 2026, not browser or live-provider acceptance.

## Launch the app

Install the project dependencies and use Node.js 24 as described in the main project README. Run from the repository root:

```powershell
.\Start-Dev.ps1
```

`Test.ps1` is an identical convenience copy of the development launcher. Despite its filename, it starts the app's development servers; it does not run automated tests. The documented `Start-Dev.ps1` remains available.

## Run the original synthetic API demonstration

From the repository root:

```powershell
.\docs\test-cases\Run-Demo.ps1
```

The demonstration uses the real application routes and SQLite with temporary accounts/media, a generated image and controlled provider responses. It does not load the project `.env` or contact live providers. It prints error handling and recovery assertions and writes results to a fresh temporary directory. Its clock and result date are fixed to the original 26 October 2026 scenario.

## Focused checks supporting the revised report

From `frontend`, with Node.js 24 on PATH:

```powershell
node --test --test-name-pattern="upload validates real content" server/observations.test.mjs
node --test --test-name-pattern="upload, private observation" server/observations.test.mjs
node --test --test-name-pattern="chat attachments reuse" server/messages.test.mjs
node --test --test-name-pattern="missing key, upstream errors" server/discovery.test.mjs
```

The controlled media-persistence test intentionally logs `API error: ERR_SQLITE_ERROR`; its expected HTTP 500 and file cleanup assertions should pass. Do not introduce that fault into the normal account database. These checks are server evidence; they do not replace the manual screenshot procedures.

## Preserve local report work

This publication contains `Bird_Wanderer_Testing_Phase_Report_Draft.docx`, not `Bird_Wanderer_Testing_Phase_Report.docx`. Keep any locally edited report under its existing filename. Review Git status before importing files, and avoid replacing an entire local report folder that contains your own edits or screenshots.

No credentials, local databases, account photographs or personal screenshots are part of this delivery. Screenshot placeholders require real, dated captures from the presenter.
