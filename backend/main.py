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

# ==========================================
# KPI DASHBOARD - WEEKLY TECHNICIAN PERFORMANCE
# ==========================================

@app.get("/api/kpi/technician-performance-this-week")
def get_technician_performance_this_week():
    """
    KPI operation:
    Calculate weekly technician performance.

    Metrics:
    - Jobs completed
    - Total completed job amount
    - Postpone / reschedule activity
    - Technician ranking

    All calculations are performed by backend logic.
    """

    now = datetime.now(timezone.utc)

    # Start of the current week (Monday)
    start_of_week = (
        now - timedelta(days=now.weekday())
    ).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    end_of_week = (
        start_of_week
        + timedelta(days=7)
    )

    # ------------------------------------------
    # STEP 1:
    # Retrieve completed jobs for the current week
    # ------------------------------------------

    completions_response = (
        supabase
        .table("job_completions")
        .select(
            """
            technician_id,
            final_amount,
            completed_at,
            technicians (
                id,
                name,
                branch
            )
            """
        )
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

    completions = completions_response.data or []

    # ------------------------------------------
    # STEP 2:
    # Retrieve weekly order activity
    #
    # We retrieve the order's assigned technician
    # so postpone/reschedule activity can be
    # associated with a technician.
    # ------------------------------------------

    activity_response = (
        supabase
        .table("order_activity")
        .select(
            """
            action,
            details,
            created_at,
            orders (
                assigned_technician_id
            )
            """
        )
        .gte(
            "created_at",
            start_of_week.isoformat(),
        )
        .lt(
            "created_at",
            end_of_week.isoformat(),
        )
        .execute()
    )

    activities = activity_response.data or []

    # ------------------------------------------
    # STEP 3:
    # Create performance records
    # from completed jobs
    # ------------------------------------------

    technician_performance = {}

    for completion in completions:

        technician_id = completion.get(
            "technician_id"
        )

        if not technician_id:
            continue

        technician = completion.get(
            "technicians"
        ) or {}

        if technician_id not in technician_performance:

            technician_performance[
                technician_id
            ] = {
                "technician_id": technician_id,
                "name": technician.get(
                    "name",
                    "Unknown Technician",
                ),
                "branch": technician.get(
                    "branch"
                ),
                "jobs_completed": 0,
                "total_amount": 0,
                "postpone_reschedule_count": 0,
            }

        technician_performance[
            technician_id
        ]["jobs_completed"] += 1

        technician_performance[
            technician_id
        ]["total_amount"] += float(
            completion.get("final_amount") or 0
        )

    # ------------------------------------------
    # STEP 4:
    # Detect postpone / reschedule activity
    #
    # Current records do not contain these actions,
    # so this will currently return 0.
    #
    # It supports future activity text such as:
    # "Order postponed"
    # "Job rescheduled"
    # etc.
    # ------------------------------------------

    postpone_reschedule_total = 0

    for activity in activities:

        action = (
            activity.get("action") or ""
        ).lower()

        details = (
            activity.get("details") or ""
        ).lower()

        activity_text = (
            action
            + " "
            + details
        )

        is_postpone_or_reschedule = any(
            keyword in activity_text
            for keyword in [
                "postpone",
                "postponed",
                "reschedule",
                "rescheduled",
            ]
        )

        if not is_postpone_or_reschedule:
            continue

        # Count the event globally
        postpone_reschedule_total += 1

        # Retrieve the technician assigned
        # to the related order
        order = activity.get("orders") or {}

        technician_id = order.get(
            "assigned_technician_id"
        )

        # If no technician is assigned,
        # keep the event in the overall total
        # but do not assign it to a technician.
        if not technician_id:
            continue

        # If this technician does not already
        # exist from completed jobs, create
        # a placeholder record for now.
        if technician_id not in technician_performance:

            technician_performance[
                technician_id
            ] = {
                "technician_id": technician_id,
                "name": "Unknown Technician",
                "branch": None,
                "jobs_completed": 0,
                "total_amount": 0,
                "postpone_reschedule_count": 0,
            }

        technician_performance[
            technician_id
        ]["postpone_reschedule_count"] += 1

    # ------------------------------------------
    # STEP 5:
    # Get proper technician information for
    # any technician created from activity only
    # ------------------------------------------

    technician_ids = list(
        technician_performance.keys()
    )

    if technician_ids:

        technicians_response = (
            supabase
            .table("technicians")
            .select(
                "id, name, branch"
            )
            .in_(
                "id",
                technician_ids,
            )
            .execute()
        )

        technicians_data = (
            technicians_response.data
            or []
        )

        technician_lookup = {
            technician["id"]: technician
            for technician in technicians_data
        }

        for technician_id, performance in (
            technician_performance.items()
        ):

            technician = technician_lookup.get(
                technician_id
            )

            if technician:

                performance["name"] = (
                    technician.get(
                        "name",
                        performance["name"],
                    )
                )

                performance["branch"] = (
                    technician.get(
                        "branch"
                    )
                )

    # ------------------------------------------
    # STEP 6:
    # Convert to list and round amounts
    # ------------------------------------------

    technicians = list(
        technician_performance.values()
    )

    for technician in technicians:

        technician["total_amount"] = round(
            technician["total_amount"],
            2,
        )

    # ------------------------------------------
    # STEP 7:
    # Rank technicians
    #
    # Primary: jobs completed
    # Secondary: total amount
    # ------------------------------------------

    technicians.sort(
        key=lambda technician: (
            technician["jobs_completed"],
            technician["total_amount"],
        ),
        reverse=True,
    )

    for index, technician in enumerate(
        technicians
    ):

        technician["rank"] = index + 1

    # ------------------------------------------
    # STEP 8:
    # Calculate overall KPI summary
    # ------------------------------------------

    total_jobs_completed = sum(
        technician["jobs_completed"]
        for technician in technicians
    )

    total_amount = round(
        sum(
            technician["total_amount"]
            for technician in technicians
        ),
        2,
    )

    active_technicians = len(
        technicians
    )

    top_technician = (
        technicians[0]
        if technicians
        else None
    )

    # ------------------------------------------
    # FINAL KPI RESPONSE
    # ------------------------------------------

    return {
        "operation": (
            "technician_kpi_this_week"
        ),

        "period": {
            "start": (
                start_of_week.isoformat()
            ),
            "end": (
                end_of_week.isoformat()
            ),
        },

        "summary": {
            "total_jobs_completed": (
                total_jobs_completed
            ),

            "total_amount": (
                total_amount
            ),

            "active_technicians": (
                active_technicians
            ),

            "postpone_reschedule_count": (
                postpone_reschedule_total
            ),

            "top_technician": (
                top_technician
            ),
        },

        "technicians": technicians,
    }

@app.get("/api/workflow-supervisor")
def workflow_supervisor():
    return get_completed_job_issues()

def get_completed_job_issues():
    """
    Controlled operation:
    Review completed jobs and identify simple operational issues.

    Only the required fields are retrieved.
    All issue detection is performed by backend logic.
    """

    # Retrieve only completed jobs and the fields needed
    completions_response = (
        supabase
        .table("job_completions")
        .select(
            """
            order_id,
            extra_charges,
            final_amount,
            payment_received,
            payment_method,
            orders (
                id,
                order_number,
                quoted_price,
                customer_name,
                service_type,
                status
            )
            """
        )
        .execute()
    )

    completions = completions_response.data

    if not completions:
        return {
            "operation": "workflow_supervisor",
            "reviewed_jobs": 0,
            "jobs_with_issues": 0,
            "issues": [],
        }

    issues = []

    for completion in completions:
        order = completion.get("orders")

        if not order:
            continue

        order_id = completion.get("order_id")

        job_issues = []

        quoted_price = float(
            order.get("quoted_price") or 0
        )

        final_amount = float(
            completion.get("final_amount") or 0
        )

        payment_received = completion.get(
            "payment_received"
        )

        # -------------------------------------------------
        # CHECK 1:
        # Final amount significantly higher than quoted price
        # -------------------------------------------------

        if quoted_price > 0:
            increase_percentage = (
                (final_amount - quoted_price)
                / quoted_price
            ) * 100

            # Flag when final amount is at least 20% higher
            if increase_percentage >= 20:
                job_issues.append({
                    "type": "high_final_amount",
                    "message": (
                        "Final amount is significantly higher "
                        "than the quoted price."
                    ),
                    "quoted_price": quoted_price,
                    "final_amount": final_amount,
                    "increase_percentage": round(
                        increase_percentage,
                        2,
                    ),
                })

        # -------------------------------------------------
        # CHECK 2:
        # Payment inconsistency
        # -------------------------------------------------

        if payment_received is not None:
            payment_received = float(
                payment_received
            )

            if payment_received > final_amount:
                job_issues.append({
                    "type": "payment_exceeds_final_amount",
                    "message": (
                        "Recorded payment is higher than the "
                        "final job amount."
                    ),
                    "final_amount": final_amount,
                    "payment_received": payment_received,
                })

        # -------------------------------------------------
        # CHECK 3:
        # Missing evidence files
        # -------------------------------------------------

        files_response = (
            supabase
            .table("job_files")
            .select("id")
            .eq("order_id", order_id)
            .limit(1)
            .execute()
        )

        has_files = len(files_response.data) > 0

        if not has_files:
            job_issues.append({
                "type": "missing_job_evidence",
                "message": (
                    "Job was completed without uploaded "
                    "evidence files."
                ),
            })

        # -------------------------------------------------
        # Add job only if issues were found
        # -------------------------------------------------

        if job_issues:
            issues.append({
                "order_id": order_id,
                "order_number": order.get(
                    "order_number"
                ),
                "customer_name": order.get(
                    "customer_name"
                ),
                "service_type": order.get(
                    "service_type"
                ),
                "issues": job_issues,
            })

    return {
        "operation": "workflow_supervisor",
        "reviewed_jobs": len(completions),
        "jobs_with_issues": len(issues),
        "issues": issues,
    }

@app.get("/api/test-order-activity")
def test_order_activity():

    response = (
        supabase
        .table("order_activity")
        .select(
            "action, old_status, new_status, details, created_at"
        )
        .order(
            "created_at",
            desc=True,
        )
        .limit(20)
        .execute()
    )

    return {
        "count": len(response.data),
        "activity": response.data,
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
                "I can currently help with completed job counts, "
                "top technician performance, jobs completed by a "
                "specific technician last week, technician workload "
                "insights, and reviews of completed jobs for "
                "operational issues."
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

    elif operation == "workflow_supervisor":
        data = get_completed_job_issues() 

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

5. workflow_supervisor

Use when the user asks to review completed jobs for operational
issues, anomalies, payment inconsistencies, unusually high final
amounts, or missing evidence.

Examples:
- Are there any issues with completed jobs?
- Review completed jobs for problems.
- Are there any workflow issues?
- Do any completed jobs look suspicious?
- Check for payment inconsistencies.
- Are any completed jobs missing evidence files?

Do not extract a technician name.

6. unsupported

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

- Questions about reviewing completed jobs for issues, anomalies,
  payment inconsistencies, unusually high amounts, or missing
  evidence mean workflow_supervisor.

Do not guess missing information.

Return ONLY valid JSON.

Use exactly this structure:

{{
  "operation": "technician_completed_jobs_last_week | top_technician_this_week | completed_today | technician_workload_this_week | workflow_supervisor | unsupported",
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
            "workflow_supervisor",
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
You are the response formatter for a service operations portal.

Your role is to turn retrieved operational data into a clear,
concise answer for a manager.

You MUST use ONLY the data provided below.

STRICT GROUNDING RULES:

- Do not invent names, job counts, dates, prices, orders,
  technicians, customers, or conclusions.
- Do not perform calculations that are not already present
  in the retrieved data.
- Do not add information that is missing from the data.
- Do not assume a problem exists unless it is explicitly
  identified in the retrieved data.
- Do not claim a technician is overloaded unless they appear
  in the "potentially_overloaded" data.
- If the data contains no relevant results, clearly say so.
- Do not mention databases, APIs, Supabase, backend logic,
  JSON, retrieved data, or internal implementation.

RESPONSE STYLE:

- Answer the manager directly.
- Keep the answer concise and easy to scan.
- Prefer short paragraphs or bullet points when listing jobs
  or issues.
- Do not repeat the user's question.
- Do not add unnecessary introductions such as
  "Based on the data provided".
- Do not speculate or give recommendations unless the retrieved
  data explicitly supports them.

OPERATION-SPECIFIC RULES:

1. completed_today

If count is greater than 0:

"{{count}} jobs were completed today."

If count is 0:

"No jobs have been completed today."

2. top_technician_this_week

If there is no technician:

"No jobs have been completed this week."

Otherwise clearly state:

"[Technician name] completed the most jobs this week with
[X] completed jobs."

Do not claim they are overloaded unless the question and
retrieved data relate to workload.

3. technician_completed_jobs_last_week

If the technician was not found:

"Technician [name] was not found."

If the technician exists but count is 0:

"[Technician name] did not complete any jobs during the
previous calendar week."

If jobs exist:

Start with:

"[Technician name] completed [X] jobs last week:"

Then list each available job using:

- Order number — Service type

Only include customer information if it is available and useful.

4. technician_workload_this_week

Use only the workload information provided.

If potentially_overloaded contains one or more technicians:

Clearly state that they have a potential higher workload.

Mention:

- technician name
- completed job count
- team average

Use cautious wording such as:

"This may indicate a higher-than-average workload."

Do not describe it as a confirmed problem.

If potentially_overloaded is empty:

State that no technician currently exceeds the defined
high-workload threshold.

You may mention the technician with the highest workload and
the team average if available.

5. workflow_supervisor

If jobs_with_issues is 0:

"No potential workflow issues were found in the reviewed jobs."

If issues exist:

Start with:

"[X] completed jobs have potential issues."

Then list each affected order and its detected issues.

Only describe issues that are explicitly present.

Do not add your own warnings or interpretations.

User question:

{question}

Operational data:

{json.dumps(data, indent=2, default=str)}

Write only the final manager-facing answer.
"""

    response = await llm.ainvoke(prompt)

    return response.content.strip()