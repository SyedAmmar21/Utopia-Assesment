import os
import json

from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_openai import ChatOpenAI

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise ValueError(
        "Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env"
    )

if not OPENAI_API_KEY:
    raise ValueError(
        "Missing OPENAI_API_KEY in .env"
    )

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
)

llm = ChatOpenAI(
    model="gpt-5.4-mini",
    temperature=0,
)

class AIQueryRequest(BaseModel):
    question: str

app = FastAPI(
    title="Utopia Operations AI Backend"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Utopia AI backend is running"
    }


@app.get("/api/test-orders")
def get_test_orders():
    """
    Controlled test query.

    Only selected fields are retrieved.
    The AI will not have direct unrestricted
    access to the database.
    """

    response = (
        supabase
        .table("orders")
        .select(
            "id, order_number, customer_name, service_type, status"
        )
        .limit(5)
        .execute()
    )

    return {
        "count": len(response.data),
        "orders": response.data,
    }

@app.get("/api/completed-today")
def get_completed_today():
    """
    Controlled operation:
    Count jobs completed today.
    """

    today = datetime.now(timezone.utc).date()

    start_of_day = datetime.combine(
        today,
        datetime.min.time(),
        tzinfo=timezone.utc,
    )

    end_of_day = start_of_day + timedelta(days=1)

    response = (
        supabase
        .table("job_completions")
        .select("id")
        .gte(
            "completed_at",
            start_of_day.isoformat(),
        )
        .lt(
            "completed_at",
            end_of_day.isoformat(),
        )
        .execute()
    )

    return {
        "operation": "completed_today",
        "count": len(response.data),
    }

@app.get("/api/top-technician-this-week")
def get_top_technician_this_week():
    """
    Controlled operation:
    Find which technician completed the most jobs this week.
    """

    now = datetime.now(timezone.utc)

    # Monday = start of the week
    start_of_week = (
        now - timedelta(days=now.weekday())
    ).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    end_of_week = start_of_week + timedelta(days=7)

    # Retrieve only the technician IDs for jobs
    # completed during this week
    completions_response = (
        supabase
        .table("job_completions")
        .select("technician_id")
        .gte(
            "completed_at",
            start_of_week.isoformat(),
        )
        .lt(
            "completed_at",
            end_of_week.isoformat(),
        )
        .execute()
    )

    completions = completions_response.data

    # No completed jobs this week
    if not completions:
        return {
            "operation": "top_technician_this_week",
            "message": "No jobs have been completed this week.",
            "technician": None,
            "completed_jobs": 0,
        }

    # Count completed jobs for each technician
    technician_counts = {}

    for completion in completions:
        technician_id = completion["technician_id"]

        technician_counts[technician_id] = (
            technician_counts.get(technician_id, 0) + 1
        )

    # Find the technician with the highest count
    top_technician_id = max(
        technician_counts,
        key=technician_counts.get,
    )

    completed_jobs = technician_counts[top_technician_id]

    # Retrieve only the relevant technician information
    technician_response = (
        supabase
        .table("technicians")
        .select("id, name")
        .eq("id", top_technician_id)
        .single()
        .execute()
    )

    technician = technician_response.data

    return {
        "operation": "top_technician_this_week",
        "technician": technician,
        "completed_jobs": completed_jobs,
    }

@app.get("/api/technician-completed-jobs-last-week/{technician_name}")
def get_technician_completed_jobs_last_week(
    technician_name: str,
):
    """
    Controlled operation:
    Find jobs completed by a specific technician
    during the previous calendar week.
    """

    now = datetime.now(timezone.utc)

    # Start of this week (Monday)
    start_of_this_week = (
        now - timedelta(days=now.weekday())
    ).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    # Previous Monday to this Monday
    start_of_last_week = (
        start_of_this_week - timedelta(days=7)
    )

    end_of_last_week = start_of_this_week

    # Step 1: Find the technician by name
    technician_response = (
        supabase
        .table("technicians")
        .select("id, name")
        .ilike("name", technician_name)
        .limit(1)
        .execute()
    )

    technicians = technician_response.data

    if not technicians:
        return {
            "operation": "technician_completed_jobs_last_week",
            "message": (
                f"Technician '{technician_name}' was not found."
            ),
            "technician": None,
            "completed_jobs": [],
            "count": 0,
        }

    technician = technicians[0]

    # Step 2: Get that technician's completed jobs
    completions_response = (
        supabase
        .table("job_completions")
        .select(
            """
            order_id,
            completed_at,
            orders (
                order_number,
                service_type,
                customer_name
            )
            """
        )
        .eq("technician_id", technician["id"])
        .gte(
            "completed_at",
            start_of_last_week.isoformat(),
        )
        .lt(
            "completed_at",
            end_of_last_week.isoformat(),
        )
        .execute()
    )

    completed_jobs = completions_response.data

    return {
        "operation": "technician_completed_jobs_last_week",
        "technician": technician,
        "count": len(completed_jobs),
        "completed_jobs": completed_jobs,
    }
@app.get("/api/technician-workload-this-week")
def get_technician_workload():
    return get_technician_workload_this_week()

def get_technician_workload_this_week():
    """
    Controlled operation:
    Calculate completed jobs per technician this week
    and identify potentially high workloads.

    All workload calculations are performed by the backend.
    The AI only explains the retrieved results.
    """

    now = datetime.now(timezone.utc)

    # Start of current week (Monday)
    start_of_week = (
        now - timedelta(days=now.weekday())
    ).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    end_of_week = start_of_week + timedelta(days=7)

    # Retrieve only technician IDs for completed jobs
    completions_response = (
        supabase
        .table("job_completions")
        .select("technician_id")
        .gte(
            "completed_at",
            start_of_week.isoformat(),
        )
        .lt(
            "completed_at",
            end_of_week.isoformat(),
        )
        .execute()
    )

    completions = completions_response.data

    if not completions:
        return {
            "operation": "technician_workload_this_week",
            "message": "No jobs have been completed this week.",
            "total_completed_jobs": 0,
            "active_technicians": 0,
            "team_average": 0,
            "highest_workload": None,
            "potentially_overloaded": [],
            "technicians": [],
        }

    # Count completed jobs for each technician
    technician_counts = {}

    for completion in completions:
        technician_id = completion["technician_id"]

        technician_counts[technician_id] = (
            technician_counts.get(technician_id, 0) + 1
        )

    technician_ids = list(technician_counts.keys())

    # Retrieve only the names of technicians involved
    technicians_response = (
        supabase
        .table("technicians")
        .select("id, name")
        .in_("id", technician_ids)
        .execute()
    )

    technicians = technicians_response.data

    technician_names = {
        technician["id"]: technician["name"]
        for technician in technicians
    }

    workload_data = []

    for technician_id, completed_jobs in technician_counts.items():
        workload_data.append({
            "technician_id": technician_id,
            "technician_name": technician_names.get(
                technician_id,
                "Unknown Technician",
            ),
            "completed_jobs": completed_jobs,
        })

    # Highest workload first
    workload_data.sort(
        key=lambda technician: technician["completed_jobs"],
        reverse=True,
    )

    total_completed_jobs = len(completions)
    active_technicians = len(workload_data)

    team_average = (
        total_completed_jobs / active_technicians
    )

    # A technician is flagged when their workload is
    # at least 50% above the team average.
    overload_threshold = team_average * 1.5

    potentially_overloaded = [
        technician
        for technician in workload_data
        if technician["completed_jobs"] >= overload_threshold
        and active_technicians > 1
    ]

    highest_workload = workload_data[0]

    return {
        "operation": "technician_workload_this_week",
        "total_completed_jobs": total_completed_jobs,
        "active_technicians": active_technicians,
        "team_average": round(team_average, 2),
        "overload_threshold": round(overload_threshold, 2),
        "highest_workload": highest_workload,
        "potentially_overloaded": potentially_overloaded,
        "technicians": workload_data,
    }

@app.post("/api/ai/query")
async def ai_query(request: AIQueryRequest):

    interpretation = await interpret_question(
        request.question
    )

    operation = interpretation["operation"]

    # Unsupported question
    if operation == "unsupported":
        return {
            "question": request.question,
            "answer": (
                "I can currently answer questions about jobs "
                "completed today, the technician with the most "
                "completed jobs this week, and jobs completed by "
                "a specific technician last week."
            ),
            "operation": operation,
        }

    # Run the selected controlled operation
    if operation == "completed_today":
        data = get_completed_today()

    elif operation == "top_technician_this_week":
        data = get_top_technician_this_week()

    elif operation == "technician_completed_jobs_last_week":
        technician_name = interpretation.get(
            "technician_name"
        )    

        if not technician_name:
            return {
                "question": request.question,
                "answer": (
                    "Please specify which technician you want "
                    "to check."
                ),
                "operation": operation,
            }

        data = get_technician_completed_jobs_last_week(
            technician_name
        )

    elif operation == "technician_workload_this_week":
        data = get_technician_workload_this_week()

    else:
        return {
            "question": request.question,
            "answer": "I could not determine a supported operation.",
            "operation": "unsupported",
        }

    # Let the AI format ONLY the retrieved structured data
    answer = await format_answer(
        request.question,
        data,
    )

    return {
        "question": request.question,
        "answer": answer,
        "operation": operation,
    }

async def interpret_question(question: str):
    prompt = f"""
You are a strict intent classifier for a service operations system.

Your task is ONLY to determine which supported controlled operation
matches the user's question.

You do not have database access.
You must not invent operations.
You must not answer the user's question.
You must only return classification JSON.

SUPPORTED OPERATIONS:

1. technician_completed_jobs_last_week

Use ONLY when the user asks about jobs completed by ONE specific
technician during the PREVIOUS CALENDAR WEEK.

Examples:
- What jobs did Ali complete last week?
- Show me the jobs Ali completed last week.
- Which jobs were completed by Ali last week?
- What work did technician Ali finish last week?

Extract the technician's name.

2. top_technician_this_week

Use ONLY when the user asks which technician completed the MOST jobs
during the CURRENT WEEK.

Examples:
- Which technician completed the most jobs this week?
- Who completed the most jobs this week?
- Who is the top technician this week?
- Which technician completed the highest number of jobs this week?

Do not extract a technician name.

3. completed_today

Use ONLY when the user asks for the NUMBER of jobs completed TODAY.

Examples:
- How many jobs were completed today?
- How many completed jobs do we have today?
- What is today's completed job count?
- How many jobs did the team finish today?

Do not extract a technician name.

4. technician_workload_this_week

Use when the user asks about technician workload,
who is handling the most work, who may be overloaded,
or which technician has an unusually high number of completed jobs
during the CURRENT WEEK.

Examples:
- Which technician might be overloaded this week?
- Who has the highest workload this week?
- Which technician is handling the most jobs this week?
- Is anyone overloaded this week?
- Who appears to have the heaviest workload this week?

Do not extract a technician name.

5. unsupported

Use this when the question does not clearly match one of the supported
operations.

Examples:
- What jobs did Ali complete this month?
- How much money did we make today?
- Show me all jobs.
- What jobs did Ali complete?

IMPORTANT RULES:

- "last week" + a specific technician's completed jobs means
  technician_completed_jobs_last_week.

- "most completed jobs this week" means
  top_technician_this_week.

- Questions about workload, being busy, overloaded, heaviest workload,
  or handling the most work this week mean
  technician_workload_this_week.

- "today" means completed_today ONLY when the user asks for
  the number or count of completed jobs.

- If the question does not clearly match a supported operation,
  choose unsupported.

Do not guess missing information.

Return ONLY valid JSON.

Use exactly this structure:

{{
  "operation": "technician_completed_jobs_last_week | top_technician_this_week | completed_today | technician_workload_this_week | unsupported",
  "technician_name": "name or null"
}}

User question:

{question}
"""

    response = await llm.ainvoke(prompt)

    content = response.content.strip()

    # Remove Markdown code fences if returned
    if content.startswith("```"):
        content = content.replace("```json", "")
        content = content.replace("```", "")
        content = content.strip()

    try:
        result = json.loads(content)

        allowed_operations = [
            "technician_completed_jobs_last_week",
            "top_technician_this_week",
            "completed_today",
            "technician_workload_this_week",
            "unsupported",
        ]

        operation = result.get("operation")

        if operation not in allowed_operations:
            return {
                "operation": "unsupported",
                "technician_name": None,
            }

        technician_name = result.get("technician_name")

        # Only this operation is allowed to have a technician name
        if operation != "technician_completed_jobs_last_week":
            technician_name = None

        if technician_name:
            technician_name = str(technician_name).strip()

            if not technician_name:
                technician_name = None

        return {
            "operation": operation,
            "technician_name": technician_name,
        }

    except (
        json.JSONDecodeError,
        TypeError,
        AttributeError,
    ):
        return {
            "operation": "unsupported",
            "technician_name": None,
        }
    
async def format_answer(question: str, data: dict):
    prompt = f"""
You are an AI assistant for a service operations system.

Answer the manager's question using ONLY the structured data provided.

STRICT RULES:

- Do not invent information.
- Do not calculate new values that are not already provided.
- Do not assume missing information.
- Do not claim a technician is overloaded unless the retrieved
  data explicitly identifies them as potentially_overloaded.
- If a technician is listed as potentially_overloaded, describe this
  as a potential workload concern, not a confirmed problem.
- Compare completed_jobs with team_average when that information
  is available.
- If there is insufficient data, clearly explain that.
- Do not mention database queries, APIs, Supabase, or internal
  implementation.
- Keep the answer concise and manager-friendly.

For workload questions:

- Clearly mention the technician's completed job count.
- Mention the team average when available.
- If potentially_overloaded is empty, explain that no technician
  currently exceeds the defined high-workload threshold.
- Do not use stronger wording than the data supports.

User question:

{question}

Retrieved operational data:

{json.dumps(data, indent=2, default=str)}

Write the final answer for the manager.
"""

    response = await llm.ainvoke(prompt)

    return response.content