# Supabase Server Client Usage

## App Router (app/ directory)

For Server Components, API Routes, and Server Actions in the App Router:

\`\`\`typescript
import { createServerSupabaseClient, supabaseServer } from '@/lib/supabase/server-app'

// In Server Components or Server Actions
const supabase = createServerSupabaseClient()

// For admin operations
const adminClient = supabaseServer
\`\`\`

## Pages Router (pages/ directory)

For API Routes and getServerSideProps in the Pages Router:

\`\`\`typescript
import { createPagesSupabaseClient, createApiSupabaseClient, supabaseServer } from '@/lib/supabase/server-pages'

// In getServerSideProps
export async function getServerSideProps(context: GetServerSidePropsContext) {
const supabase = createPagesSupabaseClient(context)
// ... your logic
}

// In API Routes
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
const supabase = createApiSupabaseClient(req, res)
// ... your logic
}
\`\`\`

## Important Rules

1. **NEVER** import `server-app.ts` in the `pages/` directory
2. **NEVER** import `server-pages.ts` in the `app/` directory
3. Use the appropriate client for your router type
4. The admin client (`supabaseServer`) is safe to use in both routers
