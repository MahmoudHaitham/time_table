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
import { Class } from "./Class";
import { Course } from "./Course";
import { CourseComponent } from "./CourseComponent";

@Entity("class_courses")
export class ClassCourse {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  class_id!: number;

  @Column({ type: "int" })
  course_id!: number;

  @ManyToOne(() => Class, (classEntity) => classEntity.classCourses)
  @JoinColumn({ name: "class_id" })
  class!: Class;

  @ManyToOne(() => Course, (course) => course.classCourses)
  @JoinColumn({ name: "course_id" })
  course!: Course;

  @OneToMany(() => CourseComponent, (component) => component.classCourse)
  components!: CourseComponent[];

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;
}

