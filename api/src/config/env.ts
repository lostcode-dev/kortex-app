import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  TZ: z.string().default('Europe/Lisbon'),
  CRON_CLOSE_DAY_SCHEDULE: z.string().default('55 23 * * *'),
  JOB_TRIGGER_TOKEN: z.string().min(16).optional(),
  CLOSE_DAY_FETCH_BATCH_SIZE: z.coerce.number().int().positive().default(500),
  CLOSE_DAY_UPSERT_BATCH_SIZE: z.coerce.number().int().positive().default(200),
})

function loadEnv() {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.flatten().fieldErrors)
    process.exit(1)
  }

  return result.data
}

export const env = loadEnv()
