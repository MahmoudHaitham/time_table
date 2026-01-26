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
import { ScheduleTemplate } from "../entities/ScheduleTemplate";

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
    ScheduleTemplate,
  ],
  extra: {
    // Connection pool settings - optimized for RAM efficiency and Neon.tech auto-scaling
    // Reduced from 100 to 20 max connections to save ~200-800MB RAM
    // Neon.tech auto-scales, so fewer connections are needed
    // - Neon Free tier: 100 connections max (we use 20 for efficiency)
    // - Neon Pro tier: 500+ connections (we use 20 for efficiency)
    max: 20, // Maximum connections in pool (reduced from 100 to save RAM)
    min: 2, // Minimum idle connections (reduced from 10 to save RAM)
    
    // Timeout settings - faster cleanup to free RAM sooner
    idleTimeoutMillis: 10000, // 10 seconds - close idle connections faster to free RAM
    connectionTimeoutMillis: 10000, // 10 second timeout for initial connection
    
    // Connection keep-alive (critical for cloud databases that close idle connections)
    // This sends TCP keep-alive packets to prevent connection termination
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000, // Start keep-alive after 10 seconds of inactivity
    
    // PostgreSQL-specific query timeout - fail faster to free resources
    statement_timeout: 10000, // 10 second query timeout (reduced from 30s)
    
    // Allow pool to create connections on demand
    allowExitOnIdle: false, // Keep pool alive even when idle
  },
});

// ✅ Do NOT auto-initialize here - let server.ts handle it
// This prevents duplicate database connections
