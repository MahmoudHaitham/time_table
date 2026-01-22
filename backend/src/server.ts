import "reflect-metadata";
import dotenv from "dotenv";
import path from "path";
import { AppDataSource } from "./config/data-source";
import app from "./app";

// ✅ Load environment variables
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

async function startServer() {
  try {
    // ✅ Prevent duplicate initialization
    if (AppDataSource.isInitialized) {
      console.log(
        "⚡ Database already initialized, skipping re-initialization"
      );
    } else {
      console.log("🚀 Initializing Database Connection...");
      await AppDataSource.initialize();
      console.log(`✅ Connected to DB: ${AppDataSource.options.database}`);
      
      // ✅ Verify connection and show schema sync status
      if (process.env.NODE_ENV !== "production") {
        console.log("📊 Database synchronization: ENABLED (tables will be auto-created from entities)");
        console.log("📋 Entities registered:");
        AppDataSource.entityMetadatas.forEach((entity) => {
          console.log(`   - ${entity.name} (table: ${entity.tableName})`);
        });
        console.log("✅ Tables will be automatically created/updated based on entities");
      } else {
        console.log("📊 Database synchronization: DISABLED (production mode)");
      }
    }

    const PORT = process.env.PORT || 5000;
    const HOST = process.env.HOST || "localhost";

    app.listen(PORT, () => {
      console.log(`🟢 Server running at: http://${HOST}:${PORT}`);
      console.log(`📚 API available at: http://${HOST}:${PORT}/api`);
    });

    // ✅ Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);

      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log("💾 Database connection closed");
      }

      console.log("✅ Graceful shutdown complete");
      process.exit(0);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2"));
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();

