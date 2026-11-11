# AI_USAGE.md

## AI Tools Utilized
- **Claude / GPT-4o / Gemini AI Assistants** for code generation, boilerplate scaffolding, and Docker setup validation.

## Usage Summary
- **Backend Setup:** Generated initial EF Core entities, API controller boilerplate, and unit testing scripts.
- **Frontend UI:** Scaffolded React Vite layout for responsive admin and student dashboards.
- **Concurrency Strategy:** Formulated PostgreSQL pessimistic locking pattern for multi-process safety.

## Observations & Corrections
- **AI Bug Detected:** Initially, AI attempted to manage hold expiration using purely client-side React timers.
  - *Fix:* Enhanced backend query logic so seat counts (`heldSeats`, `availableSeats`) dynamically check `ExpiresAt > UTC Now` at the database level.
- **Header Parsing:** AI initially missed the custom `X-Student-Id` header contract in EF Core controllers.
  - *Fix:* Standardized header extraction via middleware/controller helpers across all student-facing endpoints.
