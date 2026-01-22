import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 100, unique: true })
  registration_number!: string;

  @Column({ type: "varchar", length: 200 })
  password!: string; // Hashed password

  @Column({ type: "varchar", length: 200 })
  full_name!: string;

  @Column({ type: "varchar", length: 50, default: "admin" })
  role!: string; // "admin" | "student"

  @Column({ type: "integer", nullable: true })
  term_number!: number | null; // Student's academic term number (e.g., 6, 7, 8)

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;
}

