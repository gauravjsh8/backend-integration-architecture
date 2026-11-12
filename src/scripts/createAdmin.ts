import "dotenv/config";
import bcrypt from "bcrypt";
import { connectToDatabase } from "../config/database";

async function createAdmin(): Promise<void> {
  try {
    const database = await connectToDatabase();
    const users = database.collection("users");

    const username = "admin1";
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      console.error("Set ADMIN_PASSWORD in the .env file first.");
      process.exit(1);
    }
    const existingUser = await users.findOne({ username });

    if (existingUser) {
      console.log("Admin account already exists.");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await users.insertOne({
      username,
      password: hashedPassword,
      role: "admin",
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Admin creation failed:", error);
    process.exitCode = 1;
  }
}

createAdmin();
