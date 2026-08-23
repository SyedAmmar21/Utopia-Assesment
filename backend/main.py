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

@app.post("/api/ai/query")
async def ai_query(request: AIQueryRequest):

    interpretation = await interpret_question(
        request.question
    )

    return {
        "question": request.question,
        "interpretation": interpretation,
    }

async def interpret_question(question: str):
    prompt = f"""
You are an intent classifier for a service operations system.

Your job is to interpret the user's question and select ONLY one of
the supported operations below.

Supported operations:

1. technician_completed_jobs_last_week
   Use when the user asks what jobs a specific technician completed
   during the previous calendar week.

2. top_technician_this_week
   Use when the user asks which technician completed the most jobs
   during the current week.

3. completed_today
   Use when the user asks how many jobs were completed today.

4. unsupported
   Use when the question cannot be answered by the supported operations.

You do NOT have access to the database.
You must NOT invent data.
You are ONLY selecting which controlled operation should be used.

Return ONLY valid JSON.

Use exactly this structure:

{{
  "operation": "technician_completed_jobs_last_week | top_technician_this_week | completed_today | unsupported",
  "technician_name": "name or null"
}}

User question:

{question}
"""

    response = await llm.ainvoke(prompt)

    try:
        result = json.loads(response.content)

        allowed_operations = [
            "technician_completed_jobs_last_week",
            "top_technician_this_week",
            "completed_today",
            "unsupported",
        ]

        if result.get("operation") not in allowed_operations:
            return {
                "operation": "unsupported",
                "technician_name": None,
            }

        return {
            "operation": result.get("operation"),
            "technician_name": result.get("technician_name"),
        }

    except (json.JSONDecodeError, TypeError):
        return {
            "operation": "unsupported",
            "technician_name": None,
        }