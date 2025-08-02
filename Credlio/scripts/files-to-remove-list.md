# Comprehensive List of Files to Remove

## 1. Old Authentication Components (Confirmed for Removal)
```
components/auth/
├── auth-form.tsx                    # Old generic auth form
├── signin-form.tsx                  # Old signin (replaced by secure-signin-form.tsx)
├── signup-form.tsx                  # Old signup (replaced by secure-signup-form.tsx)
├── unified-signin-form.tsx          # Old unified signin
└── unified-signup-form.tsx          # Old unified signup
```

## 2. Mock/Test Authentication
```
lib/auth/
└── mock-auth.ts                     # Mock auth provider (not needed with real Supabase)
```

## 3. Old Authentication Context (Need Dependency Check)
```
lib/
└── auth-context.tsx                 # Old auth context provider

hooks/
└── use-auth.ts                      # Auth hooks that depend on auth-context
```

## 4. Old SQL Scripts (Can Archive)
```
scripts/
├── create_test_users.sql            # Uses old auth structure
├── cleanup_existing_auth_user.sql   # Old auth cleanup
├── debug_signup_issue.sql           # Debugging old signup
├── fix_signup_auth_policies.sql     # Old auth policies
└── test-auth-flow.ts                # Tests old auth flow
```

## 5. Backup/Old Folders (Can Remove)
```
scripts/
├── old_scripts_backup/              # Entire folder of old scripts
└── old_scripts_backuprisky_borrower_versions/  # Old risky borrower scripts
```

## 6. Potentially Unused Components (Need Dependency Check)
```
components/
├── country-specific-pricing.tsx     # May not be used
└── auth/role-selector.tsx           # May be replaced by direct signup links
```

## 7. Old Lender Context (Need Dependency Check)
```
lib/
└── lender-context.tsx               # Old lender context
```

## 8. Unused Pages (Already Redirecting)
```
app/auth/
├── page.tsx                         # Now just redirects
└── signup/page.tsx                  # Now just redirects

app/login/
├── borrower/page.tsx                # Now just redirects
└── lender/page.tsx                  # Now just redirects
```

## 9. Old Router Context
```
lib/utils/
└── router-context.tsx               # May not be needed with app router
```

## Files to Keep
```
✅ components/auth/secure-signin-form.tsx
✅ components/auth/secure-signup-form.tsx  
✅ components/auth/sign-out-button.tsx
✅ components/auth/delete-account-button.tsx
✅ lib/auth/secure-auth-utils.ts
✅ lib/services/document-verification.ts
✅ scripts/implement_secure_auth_system.sql
```

## Summary Count
- **Total files to potentially remove**: ~25 files
- **Folders to remove**: 2 folders
- **Need dependency check**: 6 files