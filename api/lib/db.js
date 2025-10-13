import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.warn('MONGO_URI is not set. API routes will fail to connect to MongoDB.');
}

let cached = globalThis.__mongoose_conn;

if (!cached) {
  cached = globalThis.__mongoose_conn = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGO_URI, {
        dbName: process.env.MONGO_DB_NAME || 'rio-cuarto-grimoire',
        serverSelectionTimeoutMS: 5000,
      })
      .then((mongoose) => mongoose)
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
