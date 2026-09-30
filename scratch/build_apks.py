import os
import subprocess
import shutil

artifacts_dir = "/Users/shreyassingh/.gemini/antigravity/brain/c63af0c5-0c9e-465d-b6bb-9dbe4c059f53/"
workspace_dir = "/Users/shreyassingh/Downloads/PG MANAGE @"

def build_app(app_dir, output_apk_name):
    print(f"Building {app_dir}...")
    app_path = os.path.join(workspace_dir, app_dir)
    
    # Kill gradle daemon just in case
    subprocess.run(["./gradlew", "--stop"], cwd=os.path.join(app_path, "android"), capture_output=True)

    # 1. npm run build
    print("Running npm build...")
    res = subprocess.run(["npm", "run", "build"], cwd=app_path, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error in npm run build for {app_dir}:", res.stderr)
        return False
        
    # 2. npx cap sync android
    print("Running cap sync...")
    res = subprocess.run(["npx", "cap", "sync", "android"], cwd=app_path, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error in cap sync for {app_dir}:", res.stderr)
        return False
        
    # 3. gradlew assembleDebug
    print("Running gradlew assembleDebug...")
    res = subprocess.run(["./gradlew", "assembleDebug", "--no-daemon"], cwd=os.path.join(app_path, "android"), capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error in gradlew assembleDebug for {app_dir}:", res.stderr)
        return False
        
    # 4. Copy APK
    apk_path = os.path.join(app_path, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk")
    target_path = os.path.join(artifacts_dir, output_apk_name)
    shutil.copy(apk_path, target_path)
    print(f"Successfully built and copied {output_apk_name}")
    return True

print("Starting APK builds...")
success_admin = build_app("Febebo-admin", "febebo-admin-latest.apk")
success_student = build_app("febebo-app", "febebo-student-latest.apk")

if success_admin and success_student:
    print("ALL BUILDS SUCCESSFUL")
else:
    print("SOME BUILDS FAILED")
