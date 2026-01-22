# Postman Requests for Creating Timetable Session

## Setup
- **Base URL**: `http://localhost:5000/api`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_AUTH_TOKEN` (if authentication is required)

---

## Step-by-Step Process

### Step 1: Get Term ID (Term 5)
**GET** `/terms`
- Find the term with `term_number: "5"` and note its `id`

**OR if you know the term ID:**

**GET** `/terms/1` (assuming term 5 has ID 1)
- Check response for term with `term_number: "5"`

---

### Step 2: Create Class "5_1" (if doesn't exist)
**POST** `/terms/:termId/classes`
- **URL**: Replace `:termId` with the actual term ID from Step 1
- **Example**: `POST /terms/1/classes`
- **Body**:
```json
{
  "class_code": "5_1"
}
```
- **Response**: Note the `id` of the created class

**OR Get existing class:**

**GET** `/terms/:termId/classes`
- Find class with `class_code: "5_1"` and note its `id`

---

### Step 3: Create Course (if doesn't exist)
**POST** `/courses`
- **Body**:
```json
{
  "code": "ECE3203",
  "name": "Computer Architecture",
  "is_elective": false,
  "components": ["L", "S", "LB"]
}
```
- **Response**: Note the `id` of the created course

**OR Get existing course:**

**GET** `/courses`
- Find course with `code: "ECE3203"` and note its `id`

---

### Step 4: Assign Course to Class
**POST** `/classes/:classId/courses`
- **URL**: Replace `:classId` with the class ID from Step 2
- **Example**: `POST /classes/1/courses`
- **Body**:
```json
{
  "course_ids": [1]
}
```
- Replace `1` with the actual course ID from Step 3
- **Response**: Note the `id` of the created `class_course` (this is the `class_course_id`)

---

### Step 5: Create Component (LB)
**POST** `/class-courses/:id/components`
- **URL**: Replace `:id` with the `class_course_id` from Step 4
- **Example**: `POST /class-courses/1/components`
- **Body**:
```json
{
  "components": [
    {
      "component_type": "LB"
    }
  ]
}
```
- **Response**: Note the `id` of the created component (this is the `component_id`)

---

### Step 6: Create Session
**POST** `/components/:componentId/sessions`
- **URL**: Replace `:componentId` with the component ID from Step 5
- **Example**: `POST /components/1/sessions`
- **Body**:
```json
{
  "day": "Saturday",
  "slot": 1,
  "room": null,
  "instructor": null
}
```

---

## Complete Example (All Steps)

Assuming:
- Term ID = 1
- Class ID = 1
- Course ID = 1
- Class Course ID = 1
- Component ID = 1

### 1. Create Class
```
POST http://localhost:5000/api/terms/1/classes
Body: {"class_code": "5_1"}
```

### 2. Create Course
```
POST http://localhost:5000/api/courses
Body: {
  "code": "ECE3203",
  "name": "Computer Architecture",
  "is_elective": false,
  "components": ["L", "S", "LB"]
}
```

### 3. Assign Course to Class
```
POST http://localhost:5000/api/classes/1/courses
Body: {"course_ids": [1]}
```

### 4. Create LB Component
```
POST http://localhost:5000/api/class-courses/1/components
Body: {
  "components": [{"component_type": "LB"}]
}
```

### 5. Create Session
```
POST http://localhost:5000/api/components/1/sessions
Body: {
  "day": "Saturday",
  "slot": 1,
  "room": null,
  "instructor": null
}
```

---

## Quick Single Request (If Everything Exists)

If the course, class, and component already exist, you only need:

**POST** `/components/:componentId/sessions`
```json
{
  "day": "Saturday",
  "slot": 1,
  "room": null,
  "instructor": null
}
```

---

## Notes
- All routes require admin authentication (Bearer token)
- Make sure to use the actual IDs from previous responses
- The `day` must be one of: "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"
- The `slot` must be between 1 and 4
- `room` and `instructor` are optional (can be null or omitted)

