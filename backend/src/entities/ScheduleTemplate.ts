import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Term } from "./Term";

/**
 * ScheduleTemplate - Pre-computed schedules for specific preference combinations
 * 
 * NEW APPROACH: Each template is pre-computed with ALL preferences already applied
 * - preferences_hash is the PRIMARY lookup key (includes all preferences)
 * - schedules are already filtered (no runtime filtering needed)
 * - Same preferences = Same hash = Instant lookup
 * 
 * BACKWARD COMPATIBILITY: Old templates still work via elective_combination_hash
 */
@Entity("schedule_templates")
@Index(["preferences_hash"], { unique: true }) // PRIMARY lookup key for new system
@Index(["term_id", "system_type", "elective_combination_hash"], { unique: true }) // For backward compatibility
@Index(["term_id"]) // Individual index for faster lookups
@Index(["system_type"]) // Individual index for faster lookups
@Index(["elective_combination_hash"]) // Individual index for faster lookups (backward compatibility)
export class ScheduleTemplate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255, nullable: true, unique: true })
  preferences_hash!: string | null; // NEW: Unified hash of ALL preferences (term, system, electives, excluded days, excluded core, instructors)

  @Column({ type: "int" })
  term_id!: number;

  @ManyToOne(() => Term)
  @JoinColumn({ name: "term_id" })
  term!: Term;

  @Column({ type: "int" })
  system_type!: number; // 140, 160, or 180

  @Column({ type: "text", nullable: true })
  elective_course_ids!: string | null; // JSON array of elective course IDs (sorted), null if core-only

  @Column({ type: "varchar", length: 255, nullable: true })
  elective_combination_hash!: string | null; // MD5 hash of sorted elective IDs (for backward compatibility)

  @Column({ type: "text", nullable: true })
  excluded_days!: string | null; // JSON array of excluded days (for reference)

  @Column({ type: "text", nullable: true })
  excluded_core_course_ids!: string | null; // JSON array of excluded core course IDs (for reference)

  @Column({ type: "text", nullable: true })
  preferred_instructors!: string | null; // JSON array of preferred instructors (for reference)

  @Column({ type: "jsonb" })
  base_schedules!: any; // Array of pre-computed schedules (already filtered with preferences applied)

  @Column({ type: "int", default: 0 })
  schedule_count!: number; // Number of schedules in base_schedules

  @Column({ type: "int", default: 0 })
  access_count!: number; // Track how many times this template was used

  @Column({ type: "timestamp", nullable: true })
  last_accessed_at!: Date | null; // Last time this template was accessed

  @Column({ type: "boolean", default: false })
  is_generating!: boolean; // True while schedules are being generated (for reservation pattern)

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;
}
