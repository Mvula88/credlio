# Potentially Unused Files After Landing Page Changes

## Files that appear to be unused:

1. **`components/navigation.tsx`**
   - Not imported anywhere
   - Contains borrower-specific navigation with signup links
   - Can likely be removed

## Files that are still in use but updated:

1. **`app/login/borrower/page.tsx` and `app/login/lender/page.tsx`**
   - Still serve as redirects to unified signin
   - Can be kept for backward compatibility

2. **`app/auth/signup/page.tsx`**
   - Updated to show role selection
   - Still referenced in multiple places
   - Should be kept

3. **`components/lender/borrower-invite.tsx`**
   - Updated to use new borrower invitation flow
   - Now redirects to `/borrower/accept-invitation/[code]`

## Code that was successfully updated:

1. **Main landing page (`/`)**
   - Removed borrower signup options
   - Now focused on lenders only

2. **Borrower landing page (`/borrower`)**
   - New dedicated landing page
   - Fetches real data from backend
   - Handles invitation codes

3. **Navigation header**
   - Updated to show "For Lenders" and "For Borrowers"
   - Clear separation between user types

## Recommendation:

You can safely delete:
- `components/navigation.tsx`

All other files are still in use and properly connected to the new landing page structure.