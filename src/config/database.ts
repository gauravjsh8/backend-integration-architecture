import { MongoClient, Db } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";

const DATABASE_NAME = "industrial_backend";

const client = new MongoClient(MONGO_URI);

let database: Db;

export async function connectToDatabase(): Promise<Db> {
  if (database) {
    return database;
  }

  await client.connect();

  database = client.db(DATABASE_NAME);

  console.log(`Connected to MongoDB database: ${DATABASE_NAME}`);

  return database;
}
