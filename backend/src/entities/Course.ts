import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { ClassCourse } from "./ClassCourse";
import { ElectivesAllowed } from "./ElectivesAllowed";

@Entity("courses")
export class Course {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50, unique: true })
  code!: string; // e.g., "CS101"

  @Column({ type: "varchar", length: 200 })
  name!: string;

  @Column({ type: "boolean", default: false })
  is_elective!: boolean;

  @Column({ type: "varchar", length: 20, default: "L,S" })
  component_types!: string; // Comma-separated: "L,S" or "L,S,LB"

  @Column({ type: "integer", nullable: true })
  term_number!: number | null; // Course's academic term number (e.g., 6, 7, 8)

  @OneToMany(() => ClassCourse, (classCourse) => classCourse.course)
  classCourses!: ClassCourse[];

  @OneToMany(() => ElectivesAllowed, (elective) => elective.course)
  electives!: ElectivesAllowed[];

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;
}

