

# 03 — Weekly Plan v0

## Goal
Create and fetch a weekly plan (training + nutrition) stored in DB.

## Endpoints
- GET /api/weekly-plan?userId=...&weekStart=YYYY-MM-DD
- POST /api/weekly-plan (creates or overwrites DRAFT for that week)

## Inputs (POST body)
{
  "userId": "string",
  "weekStart": "YYYY-MM-DD",
  "environment": "GYM|HOME|CALISTHENICS|POOL|MIXED",
  "daysPerWeek": 3,
  "sessionMinutes": 45
}

## Output
WeeklyPlan row with trainingJson + nutritionJson.

## Acceptance Criteria
- Can create a plan for a week and fetch it back.
- Plan contains 7-day structure and sessions count matches daysPerWeek.
- Uses exercises from DB filtered by environment (fallback MIXED includes all).
