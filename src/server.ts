import "dotenv/config";
import { createApp } from "./app";
import { connectToDatabase } from "./config/database";
import { UserModel } from "./models/User";

const PORT = 3000;

async function startServer(): Promise<void> {
  try {
    const database = await connectToDatabase();

     const userModel = new UserModel(database);
    await userModel.createIndexes();

     const app = createApp(database);

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the backend:", error);
    process.exitCode = 1;
  }
}

startServer();
