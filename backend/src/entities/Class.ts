import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Term } from "./Term";
import { ClassCourse } from "./ClassCourse";

@Entity("classes")
export class Class {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  term_id!: number;

  @Column({ type: "varchar", length: 20 })
  class_code!: string; // e.g., "4_1", "4_2"

  @Column({ type: "integer", nullable: true })
  system_type!: number | null; // Class's system type: 140, 160, or 180

  @ManyToOne(() => Term, (term) => term.classes)
  @JoinColumn({ name: "term_id" })
  term!: Term;

  @OneToMany(() => ClassCourse, (classCourse) => classCourse.class)
  classCourses!: ClassCourse[];

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;
}

