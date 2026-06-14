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
    try {
      // Add a short timeout to fail fast if MongoDB is not running
      const client = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 3000 });
      const db = client.db('chathub');

      cachedClient = client;
      cachedDb = db;
      return db;
    } catch (error) {
      console.error('\n❌ DB server not found. Please ensure MongoDB is running.\n');
      throw new Error('DB server not found. Please ensure MongoDB is running.');
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}
