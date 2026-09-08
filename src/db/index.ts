import { drizzle } from 'drizzle-orm/d1';
import { env } from '../env.ts';
import * as schema from './schema.ts';

export type Db = ReturnType<typeof make>;
const make = (d1: D1Database) => drizzle(d1, { schema });

/**
 * The pipeline code says `db.select()` in fifty places. Bindings only exist
 * per request, so this forwards each call to the D1 instance for the request
 * in flight. One line of indirection instead of threading a handle everywhere.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = make(env().DB) as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export { schema };
