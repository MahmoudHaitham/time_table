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

@Entity("schedule_cache")
@Index(["term_id", "excluded_days_hash", "elective_course_ids_hash", "excluded_core_course_ids_hash"], { unique: true })
@Index(["term_id"]) // Individual index for faster lookups
@Index(["excluded_days_hash"]) // Individual index for faster lookups
@Index(["elective_course_ids_hash"]) // Individual index for faster lookups
@Index(["excluded_core_course_ids_hash"]) // Individual index for faster lookups
export class ScheduleCache {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  term_id!: number;

  @ManyToOne(() => Term)
  @JoinColumn({ name: "term_id" })
  term!: Term;

  @Column({ type: "text" })
  excluded_days!: string; // JSON array of excluded days

  @Column({ type: "varchar", length: 255 })
  excluded_days_hash!: string; // Hash for quick lookup

  @Column({ type: "text", nullable: true })
  elective_course_ids!: string | null; // JSON array of elective course IDs, null if none

  @Column({ type: "varchar", length: 255, nullable: true })
  elective_course_ids_hash!: string | null; // Hash for quick lookup

  @Column({ type: "text", nullable: true })
  excluded_core_course_ids!: string | null; // JSON array of excluded core course IDs, null if none

  @Column({ type: "varchar", length: 255, nullable: true })
  excluded_core_course_ids_hash!: string | null; // Hash for quick lookup

  @Column({ type: "jsonb" })
  schedules!: any; // Full schedule data as JSON

  @Column({ type: "int", default: 0 })
  access_count!: number; // Track how many times this cache was used

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;
}
