const { MongoClient } = require("mongodb");

let client;
let database;

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "pa2_login_signup";

  client = new MongoClient(uri);
  await client.connect();
  database = client.db(dbName);

  // Database-level unique constraint prevents duplicate usernames even
  // if two signup requests arrive at nearly the same time.
  await database.collection("users").createIndex(
    { username: 1 },
    { unique: true } // Only unique usernames
  );

  console.log(`Connected to MongoDB: ${dbName}`);
  return database;
}

function getDb() {
  if (!database) {
    throw new Error("Database has not been connected.");
  }
  return database;
}

async function closeDatabase() {
  if (client) await client.close();
}

module.exports = { connectToDatabase, getDb, closeDatabase };