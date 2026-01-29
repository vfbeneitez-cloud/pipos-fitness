# 02 — API Exercises

## Goal
Expose exercises + media for the UI (plan and machine/exercise guides).

## Endpoint
GET /api/exercises

## Query params
- environment?: GYM | HOME | CALISTHENICS | POOL | MIXED
- q?: string (search by name)

## Response 200
[
  {
    id, slug, name, environment,
    primaryMuscle, cues, commonMistakes,
    media: [{ id, type, url, thumbnailUrl }]
  }
]

## Errors
- 400 invalid query params
- 500 internal

## Acceptance Criteria
- Returns seeded exercises
- Filtering by environment works
- Includes media array
