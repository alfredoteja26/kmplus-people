# Deliverable file bytes live in Firebase Storage

Superseded by ADR-0012 (Deliverable bytes in Supabase Storage).

A **Deliverable** file’s bytes live in Firebase Storage, in the same Firebase project that already holds passwords. Postgres keeps the Deliverable record and the storage path. A link has no bytes. A doctor’s letter on a sick **LeaveRequest** uses the same store.

We rejected storing the bytes in Postgres. A deck would bloat the database backups. We rejected keeping uploads out of the product, because a Deliverable may be a file with older versions.
