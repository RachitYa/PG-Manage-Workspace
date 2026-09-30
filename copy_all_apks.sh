#!/bin/bash
while true; do
  if grep -q "BUILD SUCCESSFUL" /Users/shreyassingh/.gemini/antigravity/brain/c63af0c5-0c9e-465d-b6bb-9dbe4c059f53/.system_generated/tasks/task-18127.log; then
    # Wait a bit just in case
    sleep 10
    cp "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin.apk" "/Users/shreyassingh/.gemini/antigravity/brain/c63af0c5-0c9e-465d-b6bb-9dbe4c059f53/febebo-admin-latest.apk"
    cp "/Users/shreyassingh/Downloads/PG MANAGE @/febebo-app.apk" "/Users/shreyassingh/.gemini/antigravity/brain/c63af0c5-0c9e-465d-b6bb-9dbe4c059f53/febebo-student-latest.apk"
    echo "Copied successfully"
    break
  fi
  sleep 5
done
