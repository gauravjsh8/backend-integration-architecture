import "dotenv/config";
import bcrypt from "bcrypt";
import { connectToDatabase } from "../config/database";

async function resetOperatorPassword(): Promise<void> {
  try {
    const database = await connectToDatabase();

    const users = database.collection("users");

    const newPassword = process.env.OPERATOR_PASSWORD;
    if (!newPassword) {
      console.error("Set OPERATOR_PASSWORD in the .env file first.");
      process.exit(1);
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const result = await users.updateOne(
      { username: "operator1" },
      {
        $set: {
          password: hashedPassword,
          role: "operator",
        },
      },
    );

    if (result.matchedCount === 0) {
      console.log("Operator account not found.");
    } else {
      console.log("Operator password and role updated successfully.");
    }
  } catch (error) {
    console.error("Password reset failed:", error);
    process.exitCode = 1;
  }
}

resetOperatorPassword();
