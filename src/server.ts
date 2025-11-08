// src/server.ts
import dotenv from "dotenv";
import app from "./app";
import prisma from "./config/database";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function connectWithRetry(delay = 5000) {
  while (true) {
    try {
      await prisma.$connect();
      console.log("✅ Connected to NeonDB successfully!");
      return; // exit loop when successful
    } catch (error: any) {
      console.error(`❌ Database connection failed: ${error.message}`);
      console.log(`🔁 Retrying in ${delay / 1000}s...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

async function startServer() {
  try {
    await connectWithRetry();
    const server = app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("🛑 Shutting down gracefully...");
      await prisma.$disconnect();
      server.close(() => {
        console.log("🧹 Prisma disconnected and server closed.");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("❌ Database connection failed after multiple retries:", error);
    process.exit(1);
  }
}

startServer();
