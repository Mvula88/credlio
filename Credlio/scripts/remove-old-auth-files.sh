#!/bin/bash

echo "Removing old authentication components..."

# Navigate to components/auth directory
cd "$(dirname "$0")/../components/auth"

# Delete old authentication files
echo "Deleting auth-form.tsx..."
rm -f auth-form.tsx

echo "Deleting signin-form.tsx..."
rm -f signin-form.tsx

echo "Deleting signup-form.tsx..."
rm -f signup-form.tsx

echo "Deleting unified-signin-form.tsx..."
rm -f unified-signin-form.tsx

echo "Deleting unified-signup-form.tsx..."
rm -f unified-signup-form.tsx

echo ""
echo "Old authentication files removed successfully!"
echo ""
echo "Keeping:"
echo "- secure-signin-form.tsx (new secure signin)"
echo "- secure-signup-form.tsx (new secure signup)"
echo "- sign-out-button.tsx"
echo "- delete-account-button.tsx"
echo "- role-selector.tsx"
echo ""