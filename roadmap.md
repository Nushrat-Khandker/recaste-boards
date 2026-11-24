# Calendar location correction
- [x] Hide routine location and moonrise/moonset details; label Tuesday sunset as Day 4, retain it in First Quarter until Wednesday sunset, and plot the exact phase event; 24 tests and isolated phone/desktop view checks passed.
- [x] Make Day and Phase charts span actual sunset-to-sunset intervals; verified solar line times/colors, next-morning events, sunset rollover, phone/desktop layouts, and unchanged saved event dates.
- [x] Remove manual city selection; sixteen tests passed, with isolated browser checks for shared GPS permission, retry, and denied permission.
- [x] Apply first-sunset phase boundaries across calendar views and date pickers; fifteen tests passed, and isolated phone/desktop checks verified the live sunset switch and unchanged task selection.
- [x] Apply the same location rule to Month, Quarter, Year highlights, and task date-picker moon markers; preserve saved dates and permissions.
- [x] Replace estimated moon/sun times with location-aware astronomical calculations and timezone handling.
- [x] Share location selection between Phase and Day views without changing task dates or Hijri month mapping.
- [x] Compare calculations with timeanddate.com and run regression checks (eleven passing tests; Dhaka/London within two minutes).
- [ ] Verify the signed-in calendar on the self-hosted app — blocked by unavailable managed sign-in session; isolated real calendar views passed phone/desktop checks without changing access rules.