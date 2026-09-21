# LineManager walks up vacant Positions

The reporting line is Position reports-to, not a manager field on Person. When that Position has no current Assignment, the **LineManager** is the Person on the nearest filled ancestor Position, with full draft and dual-approval powers (including the Team queue). If no filled ancestor exists, **Admin** is the remaining approver.

We rejected storing Atasan on Person, and rejected blocking KPI work until the vacant seat is filled, because vacant seats and dual-hat are normal here and the skip-up rule is the required behaviour.
