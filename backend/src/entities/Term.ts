import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Class } from "./Class";
import { ElectivesAllowed } from "./ElectivesAllowed";

@Entity("terms")
export class Term {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50 })
  term_number!: string; // e.g., "2024-2025-1"

  @Column({ type: "boolean", default: false })
  is_published!: boolean;

  @OneToMany(() => Class, (classEntity) => classEntity.term)
  classes!: Class[];

  @OneToMany(() => ElectivesAllowed, (elective) => elective.term)
  electives!: ElectivesAllowed[];

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;
}

