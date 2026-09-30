#!/bin/bash
cd "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app" && npm run preview -- --port 4173 &
cd "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-staff" && npm run preview -- --port 4174 &
cd "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin" && npm run preview -- --port 4175 &
cd "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-superadmin" && npm run preview -- --port 4176 &
wait
