# ASSUMPTIONS.md

## Specifications & Architectural Assumptions

1. **Class vs Shift Representation:**
   - As specified, each class shift (e.g., "Class 6 Morning Shift", "Class 6 Day Shift") is treated as a distinct class entity with its own dedicated seat allocation (`totalSeats`).

2. **Student Identity:**
   - Authentication is omitted per requirements. Student identification relies entirely on the 17-digit National Birth Registration Number provided in the `X-Student-Id` HTTP Header.

3. **Seat Hold Expiration & Dynamic Availability:**
   - A hold is considered valid (`HELD`) if `Status == 'HELD'` and `ExpiresAt > DateTime.UtcNow`.
   - Seat metrics (`heldSeats`, `confirmedSeats`, `availableSeats`) calculate dynamically on retrieval:
     - `heldSeats`: Active holds where status is `HELD` and `ExpiresAt > Now`.
     - `availableSeats`: `totalSeats - (heldSeats + confirmedSeats)`.
   - Expired holds automatically release back to the pool without requiring background cron jobs, though an optional periodic cleanup is supported.

4. **Active Application Constraint:**
   - A student can only have ONE active application (`HELD` or `CONFIRMED`) per class at a time. Attempting to hold another seat in the same class while holding or confirmed results in a `409 Conflict`.

5. **Multi-Instance Concurrency & Race Condition Prevention (Bonus Requirement):**
   - We utilize PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) inside database transactions.
   - When a hold request arrives, the backend locks the specific `Class` row, re-calculates active holds dynamically, checks if `availableSeats > 0`, and inserts the `Hold` within the same locked transaction block.
   - This prevents race conditions even when running multiple replica instances of the .NET backend API across multiple ports or Docker nodes.
