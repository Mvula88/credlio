@echo off
echo Removing old authentication components...

REM Navigate to components/auth directory
cd C:\Users\ineke\Downloads\credlio\Credlio\components\auth

REM Delete old authentication files
echo Deleting auth-form.tsx...
del auth-form.tsx 2>nul

echo Deleting signin-form.tsx...
del signin-form.tsx 2>nul

echo Deleting signup-form.tsx...
del signup-form.tsx 2>nul

echo Deleting unified-signin-form.tsx...
del unified-signin-form.tsx 2>nul

echo Deleting unified-signup-form.tsx...
del unified-signup-form.tsx 2>nul

echo.
echo Old authentication files removed successfully!
echo.
echo Keeping:
echo - secure-signin-form.tsx (new secure signin)
echo - secure-signup-form.tsx (new secure signup)
echo - sign-out-button.tsx
echo - delete-account-button.tsx
echo - role-selector.tsx
echo.
pause