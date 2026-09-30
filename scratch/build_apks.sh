#!/bin/bash
set -e

ARTIFACTS_DIR="/Users/shreyassingh/.gemini/antigravity/brain/c63af0c5-0c9e-465d-b6bb-9dbe4c059f53/"
WORKSPACE="/Users/shreyassingh/Downloads/PG MANAGE @"

patch_java_versions() {
    echo "Patching Java/Kotlin 21 -> 17 in all gradle files..."
    # Only regular files (-type f) to avoid sed errors on dirs/symlinks
    find android -type f -name "*.gradle" | while read f; do
        sed -i '' \
            's/JavaVersion\.VERSION_21/JavaVersion.VERSION_17/g;
             s/jvmTarget = .21./jvmTarget = '"'"'17'"'"'/g;
             s/jvmToolchain(21)/jvmToolchain(17)/g' "$f"
    done
    find node_modules/@capacitor -type f -name "*.gradle" | while read f; do
        sed -i '' \
            's/JavaVersion\.VERSION_21/JavaVersion.VERSION_17/g;
             s/jvmTarget = .21./jvmTarget = '"'"'17'"'"'/g;
             s/jvmToolchain(21)/jvmToolchain(17)/g' "$f"
    done || true
}

build_app() {
    local APP_DIR=$1
    local APK_NAME=$2
    echo "Killing any existing Java/Gradle processes..."
    pkill -f 'java.*gradle' || true
    sleep 2
    
    echo "Building $APP_DIR..."
    cd "$WORKSPACE/$APP_DIR"
    
    npm run build
    npx cap sync android
    
    patch_java_versions
    
    cd android
    echo "Cleaning Gradle build cache to force fresh packaging..."
    ./gradlew clean --no-daemon
    ./gradlew assembleDebug --no-daemon
    
    echo "Copying $APK_NAME..."
    cp app/build/outputs/apk/debug/app-debug.apk "$ARTIFACTS_DIR/$APK_NAME"
    echo "$APK_NAME Built Successfully."
}

build_app "Febebo-admin" "febebo-admin-latest.apk"
# build_app "febebo-app" "febebo-student-latest.apk"
