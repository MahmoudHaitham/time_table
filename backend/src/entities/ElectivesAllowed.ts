import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Term } from "./Term";
import { Course } from "./Course";

@Entity("electives_allowed")
export class ElectivesAllowed {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  term_id!: number;

  @Column({ type: "int" })
  course_id!: number;

  @ManyToOne(() => Term, (term) => term.electives)
  @JoinColumn({ name: "term_id" })
  term!: Term;

  @ManyToOne(() => Course, (course) => course.electives)
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;
}

