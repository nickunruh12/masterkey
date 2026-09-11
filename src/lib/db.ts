// Masterkey — MongoDB client (server-only). Single cached MongoClient reused across
// hot-reloads (dev) and serverless invocations (prod) via a global, so we never open a
// new connection pool per request. Never import this from client code.
//
// See MCP_SPEC.md §5. The DB name comes from MONGODB_DB (default "masterkey").

import { MongoClient, type Db } from "mongodb";

declare global {
  var _mkMongoClientPromise: Promise<MongoClient> | undefined;
}

function clientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!globalThis._mkMongoClientPromise) {
    // Drop the cached promise if the connect fails, so the NEXT request retries.
    // Caching the rejection instead would pin a warm serverless instance to that
    // error forever — one transient Atlas blip (or an IP-allowlist gap) would then
    // take every DB-backed route down until a redeploy replaced the instance.
    globalThis._mkMongoClientPromise = new MongoClient(uri).connect().catch((err) => {
      globalThis._mkMongoClientPromise = undefined;
      throw err;
    });
  }
  return globalThis._mkMongoClientPromise;
}

/** The shared MongoClient (connected). Prefer `getDb()` for most callers. */
export async function getMongoClient(): Promise<MongoClient> {
  return clientPromise();
}

/** The Masterkey database handle. */
export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(process.env.MONGODB_DB || "masterkey");
}
