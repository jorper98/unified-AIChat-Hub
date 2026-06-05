import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chathub';
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let connectionPromise: Promise<Db> | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    const client = await MongoClient.connect(uri);
    const db = client.db('chathub');

    cachedClient = client;
    cachedDb = db;
    connectionPromise = null;
    return db;
  })();

  return connectionPromise;
}
