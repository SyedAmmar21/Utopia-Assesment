# Sejuk Service Operations System

A full-stack internal operations system built for **Sejuk Sejuk Service Sdn Bhd**, a fictional company made for learning and situation setup. It digitises the flow of air-conditioner service jobs from order creation and technician assignment through job completion, evidence capture, operational review, KPI reporting, and controlled AI-assisted queries.

## Live Demo

The frontend is deployed on Vercel and the FastAPI backend is deployed on Render.

- Vercel frontend: [Open the live Sejuk Sejuk Operations System](https://utopia-assesment-cegpqptsy-syed-ammar.vercel.app)
- Render backend API: [Open the deployed FastAPI service](https://utopia-assessment-backend.onrender.com)
- Render API documentation: [Open Swagger UI](https://utopia-assessment-backend.onrender.com/docs)

## Project Overview

Service teams need one place to coordinate customer requests, field work, evidence, payment details, and management reporting. This prototype provides role-oriented portals for admin, technicians, and managers, with Supabase as the operational data store and a small FastAPI service for KPI aggregation and safe AI query handling.

```text
Admin
  ↓
Create & Assign Order
  ↓
Technician
  ↓
Complete Service Job
  ↓
Upload Job Evidence
  ↓
Job Done
  ↓
WhatsApp Notification / Feedback Prompt
  ↓
Manager Dashboard
  ↓
KPI + AI Operations Assistant
```

## Features

### Admin Portal

- Creates service orders with an auto-generated `ORD-<timestamp>` order number.
- Captures customer name, phone number, address, service type, problem description, quoted price, and admin notes.
- Optionally assigns an active technician at creation time; an unassigned order begins as `New`, while an assigned order begins as `Assigned`.
- Records an order-creation activity entry and provides order lists, details, assigned-technician information, completion information, and uploaded evidence.
- Shows operational counts for total, assigned, in-progress, and completed orders.

### Technician Portal

- Lets the user select a technician and view that technician’s `Assigned` and `In Progress` jobs in a responsive, field-friendly interface.
- Opens a completion form with customer, service, address, and reported-problem details.
- Automatically changes an `Assigned` order to `In Progress` when its completion form is opened.
- Records required work-done notes, optional remarks, extra charges, optional payment received, and payment method (`Cash`, `Online Transfer`, or `Card`).
- Calculates the final amount as **quoted price + extra charges** and records a completion timestamp.
- Accepts up to six evidence files: images, videos, and PDF files.
- Uploads evidence to Supabase Storage and records its metadata for later review.

### WhatsApp Notification

When a technician marks a job as `Job Done`, the app prepares and opens a WhatsApp deep-link (`wa.me`) in a new tab. The pre-filled message identifies the customer, order, technician, and completion time and asks the customer to check the completed service and leave feedback.

This is a convenience deep-link, not a WhatsApp Business API integration: the user must still interact with WhatsApp to send the message, and the system does not automatically deliver a notification or collect feedback through a separate feedback form.

### Manager Portal

- Lists `Job Done` and `Reviewed` jobs for operational review.
- Shows customer, technician, work-completed, financial, payment, and evidence details.
- Allows a manager to mark a `Job Done` order as `Reviewed`.
- Provides a weekly KPI dashboard with completed jobs, total completed amount, active technicians, postpone/reschedule count, top technician, ranked technician leaderboard, and a visual completed-jobs comparison.

### AI Operations Assistant

The assistant only answers questions mapped to a fixed set of backend operations. It does not receive unrestricted database access.

```text
Manager question
  ↓
FastAPI backend
  ↓
Controlled retrieval of relevant operational data from Supabase
  ↓
Structured data passed to OpenAI through LangChain
  ↓
AI generates a concise, grounded natural-language response
```

## Supported AI Queries

The AI classifier supports these operational questions:

- **Today’s completion count** — “How many jobs were completed today?”
- **Top technician this week** — “Which technician completed the most jobs this week?”
- **One technician’s jobs last week** — “What jobs did Ali complete last week?” The question must name one technician and refer to the previous calendar week.
- **Current-week workload** — questions about the highest workload or potential overload. A technician is flagged only when their completed-job count is at least 50% above the current team average and there is more than one active technician.
- **Completed-job workflow review** — questions about operational issues, missing evidence, payment inconsistencies, or unusually high final amounts. The backend flags final amounts at least 20% above a positive quoted price, recorded payments above the final amount, and jobs without evidence metadata.

Other time ranges, broad job listings, revenue questions, and unrecognised requests are deliberately returned as unsupported rather than being answered speculatively.

## AI Integration and Architecture

The frontend sends a question to `POST /api/ai/query`. The FastAPI service uses LangChain’s `ChatOpenAI` integration with the configured OpenAI model in two bounded stages:

1. It classifies the question into one allowed operation and extracts a technician name only when that operation requires one.
2. It runs the corresponding Supabase query and backend calculation, then sends only that structured result to the model to format a manager-facing answer.

The prompts require valid classification JSON, reject operations outside the allow-list, and instruct the formatter not to invent data or calculations. This keeps data access and calculation logic in the application layer rather than delegating database access to the model.

## System Architecture

```text
                   React + Vite + Tailwind
                    │              │
             operational data       │ KPI / AI requests
                    │              ▼
                    ▼       FastAPI Backend
        Supabase (Database + Storage) │
                    ▲                 ▼
                    └──── controlled retrieval ──── OpenAI + LangChain
```

- **React frontend:** role-oriented admin, technician, and manager screens. It uses the Supabase JavaScript client for operational data and file-storage interactions, and calls the FastAPI service for KPIs and AI questions.
- **Supabase:** PostgreSQL-backed operational records plus the `job-files` Storage bucket for evidence files.
- **FastAPI backend:** protects the AI workflow with an operation allow-list and performs server-side weekly KPI, workload, and workflow-review calculations using the Supabase Python client.
- **OpenAI + LangChain:** classifies supported questions and writes a concise answer from the backend-provided structured data only.

## Tech Stack

| Category | Technologies |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, React Router, Lucide React, Supabase JavaScript client |
| Backend | Python, FastAPI, Uvicorn, Pydantic, python-dotenv, Supabase Python client |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage (`job-files` bucket) |
| AI | OpenAI, LangChain / `langchain-openai` |
| Deployment | Vercel (frontend), Render (backend) |
| Available frontend dependency | Recharts is declared in `frontend/package.json`; the current KPI comparison is rendered with CSS progress bars rather than a Recharts component. |

## Architecture Decisions

1. **React role-oriented portals** — Separate routes and navigation keep order creation, field completion, and management review focused on the needs of each user type.
2. **Supabase for operations and evidence** — A single managed platform holds relational job data and service evidence while allowing the React application to read and write the assessment workflow directly.
3. **FastAPI for KPIs and AI** — Weekly aggregation, workload detection, workflow checks, and AI orchestration live on the server instead of relying entirely on browser calculations.
4. **Controlled retrieval before generation** — The model classifies an allow-listed intent, then receives only the result of the relevant backend operation. It is never given direct database credentials or arbitrary query capability.
5. **WhatsApp deep-link** — Opening a pre-filled `wa.me` message offers a lightweight customer-notification step without requiring a paid or separately approved WhatsApp Business API integration.
6. **Separate deployment targets** — Vercel serves the static React frontend and Render hosts the Python API, matching the runtime needs of each application.

## Order Workflow

```text
New → Assigned → In Progress → Job Done → Reviewed
```

- `New`: an admin creates an order without assigning a technician.
- `Assigned`: an admin creates an order with a technician assigned.
- `In Progress`: set automatically when the technician opens an assigned job’s completion form.
- `Job Done`: set after a completion record is saved and any selected evidence uploads and metadata are processed.
- `Reviewed`: a manager can set this after reviewing a completed job.

`Closed` is referenced by the admin dashboard’s completed-count filter, but there is no implemented UI action or workflow transition that sets an order to `Closed`.

## Database / Data Model

The following tables are referenced by the application:

| Table | Purpose |
| --- | --- |
| `orders` | Customer and service-order details, quote, assigned technician, notes, timestamps, and workflow status. |
| `technicians` | Technician identity, branch, and active status used for assignment and performance views. |
| `job_completions` | Technician completion record: work done, extra charges, final amount, remarks, payment details, technician, and completion time. |
| `job_files` | Metadata for evidence files, including order, original filename, unique storage path, file type, and upload time. |
| `order_activity` | Activity entries with action, actor, old/new status, details, and timestamp; used by the KPI endpoint when detecting postpone/reschedule text. |

## File Upload Flow

```text
Technician selects files (maximum 6)
  ↓
Files uploaded to Supabase Storage (`job-files`)
  ↓
Unique path generated: <order-id>/<timestamp>-<uuid>-<filename>
  ↓
Metadata stored in `job_files`
```

The client validates images, videos, and PDF files before upload. The admin and manager detail screens obtain public URLs from the bucket to open or preview the uploaded files.

## KPI Calculation

`GET /api/kpi/technician-performance-this-week` calculates the current UTC calendar week (Monday through the following Monday) on the backend. It returns:

- Jobs completed and total completed amount
- Active technicians with completed jobs or recognised activity
- Postpone/reschedule count and technician attribution where an assigned technician exists
- Technician ranking, ordered by completed jobs and then total amount
- The top technician and per-technician metrics for the KPI dashboard

The code supports postpone/reschedule detection by matching those words in `order_activity` records. The currently created activity record is an order-creation record, so this metric remains zero unless corresponding activity is recorded.


## Limitations

- There is no real authentication, authorization, or role-based access control; portal switching is simulated.
- An existing order can be viewed but not reassigned or edited through the current UI.
- WhatsApp requires a user to send the prepared message, and there is no feedback-form or delivery-status integration.
- KPI reporting is focused on the current week. Postpone/reschedule metrics depend on relevant activity records being written.
- AI requests are intentionally limited to five supported operations and fixed time scopes. The classifier can return an unsupported result if a question is ambiguous or outside those scopes.
- The workflow supervisor reads all completion records when performing its simple checks; it is not a full audit or anomaly-detection system.
- The frontend currently hard-codes the deployed Render URLs for KPI and AI calls, so local frontend development will use that deployed backend unless the source is changed.
- Supabase bucket access relies on public URLs in the current implementation; production storage policies and access controls would need further design.
- A Render service can experience cold starts depending on its hosting plan.

## Running Locally

### Prerequisites

- Node.js and npm
- Python 3.11 or later
- [uv](https://docs.astral.sh/uv/)
- A Supabase project configured with the referenced tables and `job-files` bucket
- An OpenAI API key for the backend AI endpoints

### Configure environment files

Copy the templates and fill in values from your own Supabase/OpenAI projects. Do not commit `.env` files or secret keys.

```powershell
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
```

`frontend/.env` uses the public browser variables:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`backend/.env` uses server-only values:

```dotenv
SUPABASE_URL=
SUPABASE_SECRET_KEY=
OPENAI_API_KEY=
```

There is no `VITE_API_URL` variable in the current code. The KPI and AI pages call the deployed Render backend URL directly.

### Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Vite serves the frontend locally, normally at `http://localhost:5173`.

### Start the backend

In a second terminal:

```powershell
cd backend
uv sync
uv run uvicorn main:app --reload
```

The FastAPI server runs locally at `http://127.0.0.1:8000`; interactive documentation is available at `http://127.0.0.1:8000/docs`.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | Basic backend health message. |
| `GET` | `/api/test-orders` | Returns up to five orders with selected fields; a controlled test query. |
| `GET` | `/api/completed-today` | Counts completion records created today in UTC. |
| `GET` | `/api/top-technician-this-week` | Finds the technician with the most completed jobs in the current UTC week. |
| `GET` | `/api/technician-completed-jobs-last-week/{technician_name}` | Returns one named technician’s completed jobs from the previous UTC calendar week. |
| `GET` | `/api/technician-workload-this-week` | Returns current-week completed-job workload, average, highest workload, and potential overload flags. |
| `GET` | `/api/kpi/technician-performance-this-week` | Returns current-week technician KPI summary, ranking, amounts, and postpone/reschedule metrics. |
| `GET` | `/api/workflow-supervisor` | Checks completion records for selected amount, payment, and evidence issues. |
| `GET` | `/api/test-order-activity` | Returns the latest 20 order-activity records for inspection. |
| `POST` | `/api/ai/query` | Accepts `{ "question": "..." }`, selects a supported controlled operation, and returns a grounded natural-language answer. |

