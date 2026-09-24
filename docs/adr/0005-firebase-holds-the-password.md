# Firebase holds the password; the app keeps the session

Passwords live in Firebase Authentication on the free Spark plan. The app does not store a password hash. HR creates the User and sets the login email (`@kmplus.co.id`). Firebase sends the set-password mail from its default sender. The person sets the password on a page in this app. After Firebase accepts the password, the app writes its existing session cookie. Navbar, sidebar, and the API keep trusting that cookie.

We rejected password hashes in Postgres. We rejected email-link sign-in because the free plan allows 5 of those emails per day, against 150 password-setup emails per day. We rejected checking Firebase on every request.
