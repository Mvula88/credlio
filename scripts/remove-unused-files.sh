#!/bin/bash

echo "========================================"
echo "Removing Unused Files from Credlio"
echo "========================================"
echo ""

# Get the base directory (parent of scripts folder)
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# 1. Remove Old Authentication Components
echo "[1/6] Removing old authentication components..."
cd "$BASE_DIR/components/auth"
rm -f auth-form.tsx
rm -f signin-form.tsx
rm -f signup-form.tsx
rm -f unified-signin-form.tsx
rm -f unified-signup-form.tsx
rm -f role-selector.tsx
echo "   Done."
echo ""

# 2. Remove Mock Authentication
echo "[2/6] Removing mock authentication..."
cd "$BASE_DIR/lib/auth"
rm -f mock-auth.ts
echo "   Done."
echo ""

# 3. Remove Router Context
echo "[3/6] Removing unused router context..."
cd "$BASE_DIR/lib/utils"
rm -f router-context.tsx
echo "   Done."
echo ""

# 4. Remove Old SQL Scripts
echo "[4/6] Removing old SQL scripts..."
cd "$BASE_DIR/scripts"
rm -f create_test_users.sql
rm -f cleanup_existing_auth_user.sql
rm -f debug_signup_issue.sql
rm -f fix_signup_auth_policies.sql
rm -f test-auth-flow.ts
echo "   Done."
echo ""

# 5. Remove Old Backup Folders
echo "[5/6] Removing old backup folders..."
cd "$BASE_DIR/scripts"
if [ -d "old_scripts_backup" ]; then
    rm -rf old_scripts_backup
    echo "   Removed old_scripts_backup folder"
fi
if [ -d "old_scripts_backuprisky_borrower_versions" ]; then
    rm -rf old_scripts_backuprisky_borrower_versions
    echo "   Removed old_scripts_backuprisky_borrower_versions folder"
fi
echo "   Done."
echo ""

# 6. Summary
echo "[6/6] Cleanup Complete!"
echo ""
echo "========================================"
echo "Summary of Removed Files:"
echo "========================================"
echo ""
echo "Authentication Components (6 files):"
echo "- auth-form.tsx"
echo "- signin-form.tsx"
echo "- signup-form.tsx"
echo "- unified-signin-form.tsx"
echo "- unified-signup-form.tsx"
echo "- role-selector.tsx"
echo ""
echo "Mock/Test Files (2 files):"
echo "- mock-auth.ts"
echo "- router-context.tsx"
echo ""
echo "Old SQL Scripts (5 files):"
echo "- create_test_users.sql"
echo "- cleanup_existing_auth_user.sql"
echo "- debug_signup_issue.sql"
echo "- fix_signup_auth_policies.sql"
echo "- test-auth-flow.ts"
echo ""
echo "Backup Folders (2 folders):"
echo "- old_scripts_backup/"
echo "- old_scripts_backuprisky_borrower_versions/"
echo ""
echo "Total: 15 files + 2 folders removed"
echo "========================================"
echo ""