# Deliverable file bytes live in Supabase Storage

Supersedes ADR-0007. A **Deliverable** file's bytes, a doctor's letter on a sick **LeaveRequest**, and the evidence files on a **ReimbursementRequest** live in the private `tenant-files` bucket of the same Supabase project that holds passwords (ADR-0011). Postgres keeps the record and the storage path; a link has no bytes.

The browser uploads straight to Supabase. The app checks the session, purpose, and size (20 MB), then hands out a signed upload URL for a fresh path; that URL cannot overwrite an existing file. The bytes never pass through a Vercel function, whose request body stops at 4.5 MB. Nobody reads the bucket without the secret key, which only the server holds.

We rejected streaming uploads through the app (Vercel's body limit) and keeping Firebase only for files (a second vendor and service account for one feature).
