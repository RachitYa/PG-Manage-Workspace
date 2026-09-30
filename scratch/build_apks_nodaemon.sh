#!/bin/bash
set -e

ARTIFACTS_DIR="/Users/shreyassingh/.gemini/antigravity/brain/c63af0c5-0c9e-465d-b6bb-9dbe4c059f53/"
WORKSPACE="/Users/shreyassingh/Downloads/PG MANAGE @"

build_app() {
    local APP_DIR=$1
    local APK_NAME=$2
    echo "Killing any existing Java/Gradle processes..."
    pkill -f 'java.*gradle' || true
    sleep 2
    
    echo "Building $APP_DIR..."
    cd "$WORKSPACE/$APP_DIR"
    
    cd android
    # We rely on the already generated web assets (from the previous failed runs)
    # Just run assembleDebug without any daemon args, letting gradle use default memory
    ./gradlew assembleDebug --no-daemon
    
    echo "Copying $APK_NAME..."
    cp app/build/outputs/apk/debug/app-debug.apk "$ARTIFACTS_DIR/$APK_NAME"
    echo "$APK_NAME Built Successfully."
}

build_app "Febebo-admin" "febebo-admin-latest.apk"
build_app "febebo-app" "febebo-student-latest.apk"
