import {getDatabase} from "@netlify/database";
let client:ReturnType<typeof getDatabase> | undefined;
export function getNetlifyDatabase(){return client ??= getDatabase();}
