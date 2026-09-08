import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { config } from '../config.ts';
import * as schema from './schema.ts';

export const client = createClient({ url: config.databaseUrl });
export const db = drizzle(client, { schema });
export { schema };
