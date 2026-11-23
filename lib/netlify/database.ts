import {getNetlifyDatabase} from "./connection";
import {drizzle} from "drizzle-orm/node-postgres";
import * as schema from "./schema";
const createDb = () => drizzle(getNetlifyDatabase().pool, {schema});
let database: ReturnType<typeof createDb> | undefined;
export function getDb() { return database ??= createDb(); }
