#!/bin/bash
set -e
WORKSPACE="/Users/shreyassingh/Downloads/PG MANAGE @"

echo "Building febebo-app..."
cd "$WORKSPACE/febebo-app"
npm run build
npx cap sync android
sed -i '' 's/VERSION_21/VERSION_17/g' android/app/capacitor.build.gradle
cd android
./gradlew assembleDebug --no-daemon
cp app/build/outputs/apk/debug/app-debug.apk "$WORKSPACE/febebo-app.apk"

echo "Building Febebo-admin..."
cd "$WORKSPACE/Febebo-admin"
npm run build
npx cap sync android
sed -i '' 's/VERSION_21/VERSION_17/g' android/app/capacitor.build.gradle
cd android
./gradlew assembleDebug --no-daemon
cp app/build/outputs/apk/debug/app-debug.apk "$WORKSPACE/Febebo-admin.apk"

echo "ALL DONE"
