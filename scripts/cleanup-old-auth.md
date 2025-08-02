# Old Authentication Files to Remove

## Components to Delete:
1. `components/auth/auth-form.tsx` - Old generic auth form
2. `components/auth/signin-form.tsx` - Old signin form (replaced by secure-signin-form.tsx)
3. `components/auth/signup-form.tsx` - Old signup form (replaced by secure-signup-form.tsx)
4. `components/auth/unified-signin-form.tsx` - Old unified signin
5. `components/auth/unified-signup-form.tsx` - Old unified signup

## Pages to Update:
1. `app/auth/page.tsx` - Currently uses AuthForm
2. `app/auth/signup/page.tsx` - Currently uses UnifiedSignUpForm
3. `app/login/borrower/page.tsx` - Need to check
4. `app/login/lender/page.tsx` - Need to check

## Components to Keep:
- ✅ `secure-signin-form.tsx` - New secure signin
- ✅ `secure-signup-form.tsx` - New secure signup
- ✅ `sign-out-button.tsx` - Still needed
- ✅ `delete-account-button.tsx` - Still needed
- ✅ `role-selector.tsx` - Might still be useful

## Recommended Actions:
1. Delete the old components listed above
2. Update the pages to use the new secure forms
3. Redirect old login routes to new auth routes