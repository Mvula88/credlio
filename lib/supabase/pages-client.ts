import { createPagesServerClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/types/database"
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next"

// Safe for Pages Router - user context only, no service role key
export const createPagesSupabaseClient = (
  context: GetServerSidePropsContext | { req: NextApiRequest; res: NextApiResponse },
) => {
  return createPagesServerClient<Database>(context)
}
