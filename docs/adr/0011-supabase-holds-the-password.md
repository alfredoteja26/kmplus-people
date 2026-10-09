# Supabase holds the password; the app keeps the session

Supersedes ADR-0005. The app moves to Vercel with Supabase as its backend, so passwords move from Firebase Authentication to Supabase Auth. Everything else in ADR-0005 stands: the app does not store a password hash for real logins, HR sets the login email (`@kmplus.co.id`), the person sets the password on `/login/password`, and once Supabase accepts the password the app writes its own session cookie. Navbar, sidebar, middleware, and the API keep trusting that cookie, and `authEpoch` still revokes it.

Only the server talks to Supabase Auth. It uses the publishable key for sign-in and the recovery link, and the secret key to create and rename logins. The browser never holds a Supabase key or session. The set-password email links to `/login/password?token_hash=…`, and the server redeems that hash.

The app sends the set-password email itself, through the company mail server (`mail.kmplus.co.id`). Supabase only mints the recovery token (`generateLink`). That server never completes a connection from Supabase's mailer, on 465 or 587, but it accepts Vercel. Since Supabase no longer rate-limits these emails, the public forgot-password route sends at most one a minute per User. Without SMTP settings (local dev) the app falls back to Supabase's mailer. Public sign-up stays off: a login exists only because HR set a login email.

We rejected a third-party email service; the company keeps sending from its own server. We rejected `@supabase/ssr` sessions in the browser. The app reads data through Prisma on the server, not through Supabase's Data API, so a second session would only add a second thing to revoke.
