import "reflect-metadata";
import dotenv from "dotenv";
import path from "path";
import { AppDataSource } from "./config/data-source";
import app from "./app";
import { ensureDbConnection } from "./utils/dbConnection";

// ✅ Load environment variables
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

// Connection health check and reconnection utility (uses shared utility)
async function ensureDatabaseConnection() {
  try {
    if (!AppDataSource.isInitialized) {
      console.log("🚀 Initializing Database Connection...");
      await AppDataSource.initialize();
      console.log(`✅ Connected to DB: ${AppDataSource.options.database}`);
    } else {
      // Test if connection is still alive
      const isReady = await ensureDbConnection();
      if (!isReady) {
        throw new Error("Database connection not ready");
      }
    }
  } catch (error: any) {
    console.error("❌ Database connection error:", error.message);
    // Retry after 5 seconds
    setTimeout(() => {
      console.log("🔄 Retrying database connection...");
      ensureDatabaseConnection();
    }, 5000);
    throw error;
  }
}

async function startServer() {
  try {
    // ✅ Initialize database connection with health checks
    await ensureDatabaseConnection();
    
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
    
    // ✅ Set up periodic connection health check (every 30 seconds)
    setInterval(async () => {
      try {
        if (AppDataSource.isInitialized) {
          await AppDataSource.query("SELECT 1");
        }
      } catch (error: any) {
        console.warn("⚠️  Connection health check failed, reconnecting...");
        await ensureDatabaseConnection();
      }
    }, 30000); // Check every 30 seconds

    const PORT = process.env.PORT || 5000;
    // Listen on all interfaces (both IPv4 and IPv6)
    // Using undefined makes Node.js listen on both IPv4 (0.0.0.0) and IPv6 (::)
    app.listen(PORT, undefined, () => {
      console.log(`🟢 Server running at: http://localhost:${PORT}`);
      console.log(`📚 API available at: http://localhost:${PORT}/api`);
      console.log(`🌐 Listening on all interfaces (IPv4 and IPv6) on port ${PORT}`);
    });

    // ✅ Handle database connection errors from the pool
    // Note: TypeORM's driver.pool might not always expose event handlers
    // We handle reconnection through the health check interval and ensureDbConnection utility
    if (AppDataSource.driver && (AppDataSource.driver as any).pool) {
      try {
        const pool = (AppDataSource.driver as any).pool;
        if (pool && typeof pool.on === "function") {
          pool.on("error", async (err: Error) => {
            console.error("❌ Database pool error:", err.message);
            if (err.message.includes("Connection terminated") || err.message.includes("Connection closed")) {
              console.log("🔄 Pool error detected, attempting to reconnect...");
              try {
                await ensureDatabaseConnection();
                console.log("✅ Reconnection successful");
              } catch (reconnectError: any) {
                console.error("❌ Reconnection failed:", reconnectError.message);
              }
            }
          });
        }
      } catch (error) {
        // Pool event handler setup failed, but health checks will handle reconnection
        console.warn("⚠️  Could not set up pool error handler, relying on health checks");
      }
    }

    // ✅ Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);

      if (AppDataSource.isInitialized) {
        try {
          await AppDataSource.destroy();
          console.log("💾 Database connection closed");
        } catch (error: any) {
          console.error("⚠️  Error closing database connection:", error.message);
        }
      }

      console.log("✅ Graceful shutdown complete");
      process.exit(0);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2"));
    
    // Handle uncaught exceptions
    process.on("uncaughtException", (error: Error) => {
      console.error("❌ Uncaught Exception:", error);
      if (error.message.includes("Connection terminated") || error.message.includes("Connection closed")) {
        ensureDatabaseConnection().catch(console.error);
      }
    });
    
    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason: any) => {
      console.error("❌ Unhandled Rejection:", reason);
      if (reason?.message?.includes("Connection terminated") || reason?.message?.includes("Connection closed")) {
        ensureDatabaseConnection().catch(console.error);
      }
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

startServer();

