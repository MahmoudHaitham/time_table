import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";

// ✅ Load environment variables
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

// ✅ Show database connection details for debugging
console.log("🧭 Database configuration:");
console.log(`   Host: ${process.env.DB_HOST}`);
console.log(`   Port: ${process.env.DB_PORT}`);
console.log(`   Database: ${process.env.DB_NAME}`);
console.log(`   SSL Enabled: ${process.env.DB_SSL === "true" ? "✅ Yes" : "❌ No"}`);

// ✅ Entities
import { User } from "../entities/User";
import { Term } from "../entities/Term";
import { Class } from "../entities/Class";
import { Course } from "../entities/Course";
import { ClassCourse } from "../entities/ClassCourse";
import { CourseComponent } from "../entities/CourseComponent";
import { Session } from "../entities/Session";
import { ElectivesAllowed } from "../entities/ElectivesAllowed";
import { ScheduleCache } from "../entities/ScheduleCache";

// ✅ Configure and export DataSource
export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  synchronize: process.env.NODE_ENV !== "production", // Auto-create tables in development
  logging: process.env.NODE_ENV === "development" ? ["error", "warn", "schema"] : false,
  entities: [
    User,
    Term,
    Class,
    Course,
    ClassCourse,
    CourseComponent,
    Session,
    ElectivesAllowed,
    ScheduleCache,
  ],
  extra: {
    // Connection pool settings - optimized for 100-300 concurrent users
    max: 100, // Increased significantly for high concurrency
    min: 10, // Keep more connections ready
    idleTimeoutMillis: 300000, // 5 minutes - keep idle connections longer
    connectionTimeoutMillis: 60000, // 60 second timeout for initial connection
    acquireTimeoutMillis: 60000, // Wait up to 60 seconds to acquire connection from pool
    // PostgreSQL-specific optimizations
    statement_timeout: 60000, // 60 second query timeout
    query_timeout: 60000,
    // Connection pool optimization
    poolSize: 100,
    maxQueryExecutionTime: 60000,
    // Retry connection on failure
    retry: {
      max: 3,
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ETIMEDOUT/,
        /timeout/i,
      ],
    },
  },
});

// ✅ Do NOT auto-initialize here - let server.ts handle it
// This prevents duplicate database connections
