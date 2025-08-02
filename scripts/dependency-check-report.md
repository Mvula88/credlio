# Dependency Check Report

## Files That CAN Be Safely Removed (No Dependencies)

### 1. Old Authentication Components ✅
- `components/auth/auth-form.tsx` - Only used in old auth pages we're redirecting
- `components/auth/signin-form.tsx` - Replaced by secure-signin-form
- `components/auth/signup-form.tsx` - Replaced by secure-signup-form
- `components/auth/unified-signin-form.tsx` - No longer used
- `components/auth/unified-signup-form.tsx` - No longer used

### 2. Mock Authentication ✅
- `lib/auth/mock-auth.ts` - No imports found

### 3. Router Context ✅
- `lib/utils/router-context.tsx` - No imports found

### 4. Old SQL Scripts ✅
- All old SQL scripts can be archived/removed

### 5. Old Backup Folders ✅
- `scripts/old_scripts_backup/`
- `scripts/old_scripts_backuprisky_borrower_versions/`

## Files That CANNOT Be Removed (Still Have Dependencies)

### 1. Auth Context ❌
- `lib/auth-context.tsx` - Used by:
  - `components/providers/client-providers.tsx`
  - `hooks/use-auth.ts`
  - `components/layout/header.tsx`
  
**Action Needed**: Would need to update these components to use Supabase auth directly

### 2. Lender Context ❌
- `lib/lender-context.tsx` - Used by:
  - `app/lender/dashboard/layout.tsx`
  
**Action Needed**: Still actively used in lender dashboard

### 3. Country Specific Pricing ❌
- `components/country-specific-pricing.tsx` - Used by:
  - `app/lender-disclaimer/page.tsx`
  
**Action Needed**: Still used in lender disclaimer page

### 4. Role Selector ⚠️
- `components/auth/role-selector.tsx` - Only used in old auth-form
- **Can be removed** if we remove auth-form

## Recommendation

### Safe to Remove Now (15 files + 2 folders):
1. All old auth components (5 files)
2. Mock auth (1 file)
3. Router context (1 file)
4. Role selector (1 file)
5. Old SQL scripts (7 files)
6. Old backup folders (2 folders)

### Keep for Now (3 files):
1. `lib/auth-context.tsx` - Needs refactoring
2. `lib/lender-context.tsx` - Still in use
3. `components/country-specific-pricing.tsx` - Still in use

### Optional: Update These Files
The auth-context could be refactored to use Supabase auth directly, but this would require updating:
- Header component
- Client providers
- Any components using useAuth hooks

Would you like me to:
1. Create a script to remove the safe files?
2. Update the components to remove auth-context dependency?