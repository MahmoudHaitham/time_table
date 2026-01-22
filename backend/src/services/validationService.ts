import { AppDataSource } from "../config/data-source";
import { Term } from "../entities/Term";
import { ClassCourse } from "../entities/ClassCourse";
import { CourseComponent, ComponentType } from "../entities/CourseComponent";
import { Session } from "../entities/Session";
import { Class } from "../entities/Class";

export interface ValidationError {
  type: string;
  message: string;
  details?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a term's timetable structure
 */
export async function validateTerm(termId: number): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  try {
    const termRepo = AppDataSource.getRepository(Term);
    const term = await termRepo.findOne({
      where: { id: termId },
      relations: ["classes"],
    });

    if (!term) {
      return {
        isValid: false,
        errors: [{ type: "TERM_NOT_FOUND", message: "Term not found" }],
      };
    }

    const classRepo = AppDataSource.getRepository(Class);
    const classes = await classRepo.find({
      where: { term_id: termId },
    });

    for (const classEntity of classes) {
      // Get all class courses for this class
      const classCourseRepo = AppDataSource.getRepository(ClassCourse);
      const classCourses = await classCourseRepo.find({
        where: { class_id: classEntity.id },
        relations: ["course", "components"],
      });

      for (const classCourse of classCourses) {
        // Check if course has at least one Lecture (L)
        const componentRepo = AppDataSource.getRepository(CourseComponent);
        const components = await componentRepo.find({
          where: { class_course_id: classCourse.id },
        });

        const hasLecture = components.some(
          (c) => c.component_type === ComponentType.LECTURE
        );

        if (!hasLecture) {
          errors.push({
            type: "MISSING_LECTURE",
            message: `Course ${classCourse.course.code} in class ${classEntity.class_code} is missing a Lecture (L) component`,
            details: {
              classId: classEntity.id,
              classCode: classEntity.class_code,
              courseId: classCourse.course.id,
              courseCode: classCourse.course.code,
            },
          });
        }

        // Check for incomplete bundles
        const lectureComponents = components.filter(
          (c) => c.component_type === ComponentType.LECTURE
        );
        const sectionComponents = components.filter(
          (c) => c.component_type === ComponentType.SECTION
        );
        const labComponents = components.filter(
          (c) => c.component_type === ComponentType.LAB
        );

        // If course has S or LB, it must have L
        if (
          (sectionComponents.length > 0 || labComponents.length > 0) &&
          lectureComponents.length === 0
        ) {
          errors.push({
            type: "INCOMPLETE_BUNDLE",
            message: `Course ${classCourse.course.code} in class ${classEntity.class_code} has Section/Lab components but no Lecture`,
            details: {
              classId: classEntity.id,
              classCode: classEntity.class_code,
              courseId: classCourse.course.id,
              courseCode: classCourse.course.code,
            },
          });
        }

        // Collect all component IDs for this class
        const allComponentIds: number[] = [];
        for (const component of components) {
          allComponentIds.push(component.id);
        }

        // Validate sessions across all components in the class
        if (allComponentIds.length > 0) {
          const sessionRepo = AppDataSource.getRepository(Session);
          const allSessions = await sessionRepo
            .createQueryBuilder("session")
            .where("session.component_id IN (:...componentIds)", {
              componentIds: allComponentIds,
            })
            .getMany();

          // Check slot range
          for (const session of allSessions) {
            if (session.slot < 1 || session.slot > 4) {
              const component = components.find((c) => c.id === session.component_id);
              errors.push({
                type: "INVALID_SLOT",
                message: `Invalid slot ${session.slot} for component of course ${classCourse.course.code} in class ${classEntity.class_code}`,
                details: {
                  classId: classEntity.id,
                  classCode: classEntity.class_code,
                  courseId: classCourse.course.id,
                  courseCode: classCourse.course.code,
                  componentId: session.component_id,
                  componentType: component?.component_type,
                  sessionId: session.id,
                  slot: session.slot,
                },
              });
            }
          }

          // Check max 4 sessions per day per class
          const sessionsByDay: Record<string, Session[]> = {};
          for (const session of allSessions) {
            if (!sessionsByDay[session.day]) {
              sessionsByDay[session.day] = [];
            }
            sessionsByDay[session.day].push(session);
          }

          for (const [day, daySessions] of Object.entries(sessionsByDay)) {
            if (daySessions.length > 4) {
              errors.push({
                type: "DAY_OVERLOAD",
                message: `Class ${classEntity.class_code} has more than 4 sessions on ${day}`,
                details: {
                  classId: classEntity.id,
                  classCode: classEntity.class_code,
                  day,
                  sessionCount: daySessions.length,
                },
              });
            }
          }

          // Check for collisions (same day + slot in same class) - across ALL components
          const slotMap: Record<string, Session[]> = {};
          for (const session of allSessions) {
            const key = `${session.day}-${session.slot}`;
            if (!slotMap[key]) {
              slotMap[key] = [];
            }
            slotMap[key].push(session);
          }

          for (const [key, collidingSessions] of Object.entries(slotMap)) {
            if (collidingSessions.length > 1) {
              errors.push({
                type: "COLLISION",
                message: `Class ${classEntity.class_code} has collision on ${key}`,
                details: {
                  classId: classEntity.id,
                  classCode: classEntity.class_code,
                  daySlot: key,
                  sessionIds: collidingSessions.map((s) => s.id),
                },
              });
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error("Validation error:", error);
    return {
      isValid: false,
      errors: [
        {
          type: "VALIDATION_ERROR",
          message: "An error occurred during validation",
          details: { error: String(error) },
        },
      ],
    };
  }
}

/**
 * Check for collisions when adding a new session
 */
export async function checkSessionCollision(
  classId: number,
  day: string,
  slot: number
): Promise<{ hasCollision: boolean; conflictingSession?: Session }> {
  try {
    console.log(`[checkSessionCollision] Checking collisions for classId: ${classId}, day: ${day}, slot: ${slot}`);
    
    // Get all class courses for this class ONLY (not other classes)
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classCourses = await classCourseRepo.find({
      where: { class_id: classId },
    });

    console.log(`[checkSessionCollision] Found ${classCourses.length} class courses for class ${classId}`);

    const componentIds: number[] = [];
    for (const classCourse of classCourses) {
      const componentRepo = AppDataSource.getRepository(CourseComponent);
      const components = await componentRepo.find({
        where: { class_course_id: classCourse.id },
      });
      componentIds.push(...components.map((c) => c.id));
    }

    console.log(`[checkSessionCollision] Checking collisions among ${componentIds.length} components in class ${classId}`);

    // Check for existing session with same day + slot across all components in THIS CLASS ONLY
    if (componentIds.length > 0) {
      const sessionRepo = AppDataSource.getRepository(Session);
      const existingSession = await sessionRepo
        .createQueryBuilder("session")
        .where("session.component_id IN (:...componentIds)", {
          componentIds,
        })
        .andWhere("session.day = :day", { day })
        .andWhere("session.slot = :slot", { slot })
        .getOne();

      if (existingSession) {
        console.log(`[checkSessionCollision] Collision found in class ${classId}:`, {
          existingSessionId: existingSession.id,
          componentId: existingSession.component_id,
        });
        return { hasCollision: true, conflictingSession: existingSession };
      }
    }

    console.log(`[checkSessionCollision] No collision found in class ${classId}`);
    return { hasCollision: false };
  } catch (error) {
    console.error(`[checkSessionCollision] Error checking collisions:`, error);
    return { hasCollision: false };
  }
}

/**
 * Check if class has reached max 4 sessions per day
 */
export async function checkDayLimit(
  classId: number,
  day: string
): Promise<{ canAdd: boolean; currentCount: number }> {
  try {
    console.log(`[checkDayLimit] Checking day limit for classId: ${classId}, day: ${day}`);
    
    // Get all class courses for this class ONLY (not other classes)
    const classCourseRepo = AppDataSource.getRepository(ClassCourse);
    const classCourses = await classCourseRepo.find({
      where: { class_id: classId },
    });

    console.log(`[checkDayLimit] Found ${classCourses.length} class courses for class ${classId}`);

    const componentIds: number[] = [];
    for (const classCourse of classCourses) {
      const componentRepo = AppDataSource.getRepository(CourseComponent);
      const components = await componentRepo.find({
        where: { class_course_id: classCourse.id },
      });
      componentIds.push(...components.map((c) => c.id));
    }

    if (componentIds.length === 0) {
      console.log(`[checkDayLimit] No components found for class ${classId}, allowing addition`);
      return { canAdd: true, currentCount: 0 };
    }

    // Count sessions for THIS CLASS ONLY on this day
    const sessionRepo = AppDataSource.getRepository(Session);
    const count = await sessionRepo
      .createQueryBuilder("session")
      .where("session.component_id IN (:...componentIds)", {
        componentIds,
      })
      .andWhere("session.day = :day", { day })
      .getCount();

    console.log(`[checkDayLimit] Class ${classId} has ${count} sessions on ${day} (limit: 4)`);
    return { canAdd: count < 4, currentCount: count };
  } catch (error) {
    console.error(`[checkDayLimit] Error checking day limit:`, error);
    return { canAdd: true, currentCount: 0 };
  }
}

