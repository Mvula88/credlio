@echo off
echo ========================================
echo Removing Unused Files from Credlio
echo ========================================
echo.

REM Get the base directory (parent of scripts folder)
set BASE_DIR=%~dp0..

REM 1. Remove Old Authentication Components
echo [1/6] Removing old authentication components...
cd "%BASE_DIR%\components\auth"
del /F /Q auth-form.tsx 2>nul
del /F /Q signin-form.tsx 2>nul
del /F /Q signup-form.tsx 2>nul
del /F /Q unified-signin-form.tsx 2>nul
del /F /Q unified-signup-form.tsx 2>nul
del /F /Q role-selector.tsx 2>nul
echo    Done.
echo.

REM 2. Remove Mock Authentication
echo [2/6] Removing mock authentication...
cd "%BASE_DIR%\lib\auth"
del /F /Q mock-auth.ts 2>nul
echo    Done.
echo.

REM 3. Remove Router Context
echo [3/6] Removing unused router context...
cd "%BASE_DIR%\lib\utils"
del /F /Q router-context.tsx 2>nul
echo    Done.
echo.

REM 4. Remove Old SQL Scripts
echo [4/6] Removing old SQL scripts...
cd "%BASE_DIR%\scripts"
del /F /Q create_test_users.sql 2>nul
del /F /Q cleanup_existing_auth_user.sql 2>nul
del /F /Q debug_signup_issue.sql 2>nul
del /F /Q fix_signup_auth_policies.sql 2>nul
del /F /Q test-auth-flow.ts 2>nul
echo    Done.
echo.

REM 5. Remove Old Backup Folders
echo [5/6] Removing old backup folders...
cd "%BASE_DIR%\scripts"
if exist old_scripts_backup (
    rmdir /S /Q old_scripts_backup
    echo    Removed old_scripts_backup folder
)
if exist old_scripts_backuprisky_borrower_versions (
    rmdir /S /Q old_scripts_backuprisky_borrower_versions
    echo    Removed old_scripts_backuprisky_borrower_versions folder
)
echo    Done.
echo.

REM 6. Summary
echo [6/6] Cleanup Complete!
echo.
echo ========================================
echo Summary of Removed Files:
echo ========================================
echo.
echo Authentication Components (6 files):
echo - auth-form.tsx
echo - signin-form.tsx
echo - signup-form.tsx
echo - unified-signin-form.tsx
echo - unified-signup-form.tsx
echo - role-selector.tsx
echo.
echo Mock/Test Files (2 files):
echo - mock-auth.ts
echo - router-context.tsx
echo.
echo Old SQL Scripts (5 files):
echo - create_test_users.sql
echo - cleanup_existing_auth_user.sql
echo - debug_signup_issue.sql
echo - fix_signup_auth_policies.sql
echo - test-auth-flow.ts
echo.
echo Backup Folders (2 folders):
echo - old_scripts_backup/
echo - old_scripts_backuprisky_borrower_versions/
echo.
echo Total: 15 files + 2 folders removed
echo ========================================
echo.
pause