import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("generation_logs")
export class GenerationLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 200 })
  user_name!: string;

  @Column({ type: "varchar", length: 20 })
  flow_type!: string; // 'system' | 'other'

  @Column({ type: "varchar", length: 200 })
  term_display!: string; // e.g. "System 160 - Term 5" or "Other Section"

  @Column({ type: "text", nullable: true })
  electives_selected!: string | null; // JSON array or comma-separated names

  @Column({ type: "text", nullable: true })
  core_selected!: string | null; // JSON array or comma-separated names

  @Column({ type: "varchar", length: 500 })
  result_summary!: string; // e.g. "5 schedules generated"

  @Column({ type: "jsonb", nullable: true })
  result_json!: Record<string, unknown> | null; // optional full result summary

  @CreateDateColumn({ type: "timestamp" })
  generated_at!: Date;
}
