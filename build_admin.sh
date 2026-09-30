#!/bin/bash
set -e
WORKSPACE="/Users/shreyassingh/Downloads/PG MANAGE @"

echo "Building Febebo-admin..."
cd "$WORKSPACE/Febebo-admin"
npm run build
npx cap sync android
sed -i '' 's/VERSION_21/VERSION_17/g' android/app/capacitor.build.gradle
cd android
./gradlew assembleDebug --no-daemon
cp app/build/outputs/apk/debug/app-debug.apk "$WORKSPACE/Febebo-admin.apk"
cp app/build/outputs/apk/debug/app-debug.apk "/Users/shreyassingh/.gemini/antigravity/brain/449bccf5-ba2f-4cfa-a3c9-00ee8aa3ba3b/febebo_admin_app.apk"

echo "ALL DONE"
