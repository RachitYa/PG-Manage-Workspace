#!/bin/bash
set -e

WORKSPACE="/Users/shreyassingh/Downloads/PG MANAGE @"
APPS=("Febebo-admin" "febebo-app" "febebo-staff")

for APP in "${APPS[@]}"; do
  echo "==========================================="
  echo "Building $APP..."
  echo "==========================================="
  cd "$WORKSPACE/$APP"
  
  echo "Running build..."
  npm run build
  
  echo "Syncing Capacitor Android..."
  npx cap sync android
  
  echo "Fixing Java version..."
  if [ -f "android/app/capacitor.build.gradle" ]; then
    sed -i '' 's/VERSION_21/VERSION_17/g' android/app/capacitor.build.gradle
  fi
  
  echo "Running Gradle assembleDebug..."
  cd android
  ./gradlew assembleDebug 
  
  echo "Copying APK..."
  cp app/build/outputs/apk/debug/app-debug.apk "$WORKSPACE/${APP}.apk"
  echo "$APP build complete! Saved to $WORKSPACE/${APP}.apk"
done

echo "ALL BUILDS FINISHED!"
