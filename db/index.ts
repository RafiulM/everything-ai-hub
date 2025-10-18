import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as authSchema from './schema/auth';
import * as aiSchema from './schema/ai';

export const db = drizzle(process.env.DATABASE_URL!, {
  schema: { ...authSchema, ...aiSchema },
});

export * from './schema/auth';
export * from './schema/ai';