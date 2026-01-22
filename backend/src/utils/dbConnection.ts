import { AppDataSource } from "../config/data-source";

/**
 * Ensures database connection is initialized and valid
 * Attempts to reconnect if connection is lost
 * @returns Promise<boolean> - true if connection is ready, false otherwise
 */
export async function ensureDbConnection(): Promise<boolean> {
  try {
    // Check if initialized
    if (!AppDataSource.isInitialized) {
      console.warn("[ensureDbConnection] Database not initialized, attempting to initialize...");
      try {
        await AppDataSource.initialize();
        console.log("[ensureDbConnection] Database initialized successfully");
        return true;
      } catch (error: any) {
        console.error("[ensureDbConnection] Failed to initialize database:", error.message);
        return false;
      }
    }

    // Test connection with a simple query
    try {
      await AppDataSource.query("SELECT 1");
      return true;
    } catch (error: any) {
      // Connection is initialized but not working - try to reconnect
      console.warn("[ensureDbConnection] Connection test failed, attempting to reconnect...");
      try {
        // Destroy and reinitialize
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
        }
        await AppDataSource.initialize();
        console.log("[ensureDbConnection] Reconnection successful");
        return true;
      } catch (reconnectError: any) {
        console.error("[ensureDbConnection] Reconnection failed:", reconnectError.message);
        return false;
      }
    }
  } catch (error: any) {
    console.error("[ensureDbConnection] Unexpected error:", error.message);
    return false;
  }
}

/**
 * Wrapper for database operations that ensures connection before execution
 * @param operation - Function that performs database operation
 * @param retries - Number of retry attempts (default: 1)
 * @returns Promise with operation result
 */
export async function withDbConnection<T>(
  operation: () => Promise<T>,
  retries: number = 1
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Ensure connection is ready
      const isReady = await ensureDbConnection();
      if (!isReady) {
        throw new Error("Database connection not available");
      }

      // Execute operation
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if it's a connection error
      const isConnectionError =
        error.message?.includes("Connection terminated") ||
        error.message?.includes("Connection closed") ||
        error.message?.includes("Connection ended") ||
        error.message?.includes("ECONNRESET") ||
        error.message?.includes("ETIMEDOUT") ||
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT";

      if (isConnectionError && attempt < retries) {
        console.warn(`[withDbConnection] Connection error on attempt ${attempt + 1}, retrying...`);
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      // If not a connection error or out of retries, throw
      throw error;
    }
  }

  throw lastError || new Error("Database operation failed after retries");
}
