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
import { ClassCourse } from "./ClassCourse";
import { Session } from "./Session";

export enum ComponentType {
  LECTURE = "L",
  SECTION = "S",
  LAB = "LB",
}

@Entity("course_components")
export class CourseComponent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  class_course_id!: number;

  @Column({
    type: "varchar",
    length: 10,
  })
  component_type!: ComponentType; // 'L', 'S', 'LB'

  @ManyToOne(() => ClassCourse, (classCourse) => classCourse.components)
  @JoinColumn({ name: "class_course_id" })
  classCourse!: ClassCourse;

  @OneToMany(() => Session, (session) => session.component)
  sessions!: Session[];

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;
}

