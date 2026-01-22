import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CourseComponent } from "./CourseComponent";

export enum Day {
  SATURDAY = "Saturday",
  SUNDAY = "Sunday",
  MONDAY = "Monday",
  TUESDAY = "Tuesday",
  WEDNESDAY = "Wednesday",
  THURSDAY = "Thursday",
}

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  component_id!: number;

  @Column({
    type: "varchar",
    length: 20,
  })
  day!: Day; // Saturday → Thursday

  @Column({ type: "int" })
  slot!: number; // 1 → 4

  @Column({ type: "varchar", length: 50, nullable: true })
  room!: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  instructor!: string | null;

  @ManyToOne(() => CourseComponent, (component) => component.sessions)
  @JoinColumn({ name: "component_id" })
  component!: CourseComponent;

  @CreateDateColumn({ type: "timestamp" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt!: Date;
}

