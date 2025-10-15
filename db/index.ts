import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as authSchema from './schema/auth';
import * as aiServicesSchema from './schema/ai-services';

export const db = drizzle(process.env.DATABASE_URL!, {
    schema: {
        ...authSchema,
        ...aiServicesSchema
    }
});

export { authSchema, aiServicesSchema };