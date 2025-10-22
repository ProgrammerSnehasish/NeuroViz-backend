import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import app from "./app";

dotenv.config();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Connected to NeonDB successfully!");

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

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
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

startServer();
