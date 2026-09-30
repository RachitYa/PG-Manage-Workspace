#!/bin/bash
while true; do
  if grep -q "ALL BUILDS FINISHED!" /Users/shreyassingh/.gemini/antigravity/brain/c63af0c5-0c9e-465d-b6bb-9dbe4c059f53/.system_generated/tasks/task-17990.log; then
    cp "/Users/shreyassingh/Downloads/PG MANAGE @/Febebo-admin.apk" "/Users/shreyassingh/.gemini/antigravity/brain/c63af0c5-0c9e-465d-b6bb-9dbe4c059f53/febebo-admin-latest.apk"
    echo "Copied successfully"
    break
  fi
  sleep 5
done
