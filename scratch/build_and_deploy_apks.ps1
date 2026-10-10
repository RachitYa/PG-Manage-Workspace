$ErrorActionPreference = "Stop"
$desktop = "C:\Users\RACHIT\OneDrive\Desktop"
$workspace = "C:\Users\RACHIT\OneDrive\Desktop\Febeboo"
$jdkPath = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
$env:JAVA_HOME = $jdkPath

Write-Host "=== STARTING FRESH APK GENERATION ===" -ForegroundColor Cyan

# 1. Febebo-admin
Write-Host "`n>>> [1/3] Building Febebo-admin..." -ForegroundColor Yellow
Set-Location "$workspace\Febebo-admin"
npm run build
npx cap sync android
Set-Location "$workspace\Febebo-admin\android"
.\gradlew.bat assembleDebug
$adminApk = "$workspace\Febebo-admin\android\app\build\outputs\apk\debug\app-debug.apk"
Copy-Item $adminApk -Destination "$desktop\Febebo-Admin.apk" -Force
Copy-Item $adminApk -Destination "$workspace\apk\Febebo-Admin.apk" -Force
Copy-Item $adminApk -Destination "$workspace\apks\Febebo-Admin.apk" -Force
Write-Host ">>> Febebo-Admin.apk copied to Desktop!" -ForegroundColor Green

# 2. febebo-app
Write-Host "`n>>> [2/3] Building febebo-app..." -ForegroundColor Yellow
Set-Location "$workspace\febebo-app"
npm run build
npx cap sync android
Set-Location "$workspace\febebo-app\android"
.\gradlew.bat assembleDebug
$tenantApk = "$workspace\febebo-app\android\app\build\outputs\apk\debug\app-debug.apk"
Copy-Item $tenantApk -Destination "$desktop\Febebo-Tenant.apk" -Force
Copy-Item $tenantApk -Destination "$desktop\Febebo-Student.apk" -Force
Copy-Item $tenantApk -Destination "$workspace\apk\Febebo-Student.apk" -Force
Copy-Item $tenantApk -Destination "$workspace\apks\Febebo-Student.apk" -Force
Write-Host ">>> Febebo-Tenant.apk and Febebo-Student.apk copied to Desktop!" -ForegroundColor Green

# 3. febebo-staff
Write-Host "`n>>> [3/3] Building febebo-staff..." -ForegroundColor Yellow
Set-Location "$workspace\febebo-staff"
npm run build
npx cap sync android
Set-Location "$workspace\febebo-staff\android"
.\gradlew.bat assembleDebug
$staffApk = "$workspace\febebo-staff\android\app\build\outputs\apk\debug\app-debug.apk"
Copy-Item $staffApk -Destination "$desktop\Febebo-Staff.apk" -Force
Copy-Item $staffApk -Destination "$workspace\apk\Febebo-Staff.apk" -Force
Copy-Item $staffApk -Destination "$workspace\apks\Febebo-Staff.apk" -Force
Write-Host ">>> Febebo-Staff.apk copied to Desktop!" -ForegroundColor Green

Write-Host "`n=== ALL BUILDS COMPLETED SUCCESSFULLY ===" -ForegroundColor Cyan
Set-Location $workspace
Get-ChildItem "$desktop\Febebo-*.apk" | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
