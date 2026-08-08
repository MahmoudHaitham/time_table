import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("student_problems")
export class StudentProblem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 200 })
  name!: string;

  @Column({ type: "varchar", length: 100 })
  registration_number!: string;

  /** Northampton campus: "yes" | "no" */
  @Column({ type: "varchar", length: 10 })
  northampton!: string;

  /** Term: "4" | "5" | "6" | "7" | "8" | "9" | "10" | "other"; nullable for existing rows before term was added */
  @Column({ type: "varchar", length: 10, nullable: true, default: "other" })
  term!: string | null;

  @Column({ type: "text" })
  description!: string; // Supports Arabic (UTF-8)

  /** Admin status: "pending" | "solved" | "not_solved" */
  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at!: Date;
}
