# Calendar location correction
- [x] Apply the same location rule to Month, Quarter, Year highlights, and task date-picker moon markers; preserve saved dates and permissions.
- [x] Replace estimated moon/sun times with location-aware astronomical calculations and timezone handling.
- [x] Share location selection between Phase and Day views without changing task dates or Hijri month mapping.
- [x] Compare calculations with timeanddate.com and run regression checks (eleven passing tests; Dhaka/London within two minutes).
- [ ] Verify the signed-in calendar on the self-hosted app — blocked by unavailable managed sign-in session; isolated real calendar views passed phone/desktop checks without changing access rules.