# Simple Postman Request Guide

## For: Term 5, Class 1, Saturday Slot 1, ECE3203 Computer Architecture (LB)

### Prerequisites
Make sure you have:
1. Term with `term_number: "5"` exists
2. Class with `class_code: "5_1"` exists  
3. Course `ECE3203` exists
4. Course is assigned to the class
5. LB component exists for that class-course

---

## The Main Request (Create Session)

**Method**: `POST`  
**URL**: `http://localhost:5000/api/components/:componentId/sessions`

**Replace `:componentId`** with the actual component ID (you'll get this from Step 5 below)

**Headers**:
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN
```

**Body** (raw JSON):
```json
{
  "day": "Saturday",
  "slot": 1,
  "room": null,
  "instructor": null
}
```

---

## Complete Setup (If Starting from Scratch)

### Step 1: Get Term ID
**GET** `http://localhost:5000/api/terms`
- Find term with `term_number: "5"`
- Note the `id` (e.g., `id: 1`)

### Step 2: Create Class "5_1"
**POST** `http://localhost:5000/api/terms/1/classes`  
(Replace `1` with your term ID)

**Body**:
```json
{
  "class_code": "5_1"
}
```

**Response**: Note the `id` (e.g., `id: 1`)

### Step 3: Create Course
**POST** `http://localhost:5000/api/courses`

**Body**:
```json
{
  "code": "ECE3203",
  "name": "Computer Architecture",
  "is_elective": false,
  "components": ["L", "S", "LB"]
}
```

**Response**: Note the `id` (e.g., `id: 1`)

### Step 4: Assign Course to Class
**POST** `http://localhost:5000/api/classes/1/courses`  
(Replace `1` with your class ID)

**Body**:
```json
{
  "course_ids": [1]
}
```
(Replace `1` with your course ID)

**Response**: Note the `id` in the response (this is `class_course_id`, e.g., `id: 1`)

### Step 5: Create LB Component
**POST** `http://localhost:5000/api/class-courses/1/components`  
(Replace `1` with your `class_course_id`)

**Body**:
```json
{
  "components": [
    {
      "component_type": "LB"
    }
  ]
}
```

**Response**: Note the `id` of the created component (e.g., `id: 1`)

### Step 6: Create Session (THE MAIN REQUEST)
**POST** `http://localhost:5000/api/components/1/sessions`  
(Replace `1` with your component ID from Step 5)

**Body**:
```json
{
  "day": "Saturday",
  "slot": 1,
  "room": null,
  "instructor": null
}
```

---

## Quick Copy-Paste for Postman

### Request 1: Create Class
```
POST http://localhost:5000/api/terms/1/classes
Content-Type: application/json

{"class_code": "5_1"}
```

### Request 2: Create Course
```
POST http://localhost:5000/api/courses
Content-Type: application/json

{"code": "ECE3203", "name": "Computer Architecture", "is_elective": false, "components": ["L", "S", "LB"]}
```

### Request 3: Assign Course
```
POST http://localhost:5000/api/classes/1/courses
Content-Type: application/json

{"course_ids": [1]}
```

### Request 4: Create Component
```
POST http://localhost:5000/api/class-courses/1/components
Content-Type: application/json

{"components": [{"component_type": "LB"}]}
```

### Request 5: Create Session ⭐
```
POST http://localhost:5000/api/components/1/sessions
Content-Type: application/json

{"day": "Saturday", "slot": 1, "room": null, "instructor": null}
```

**Note**: Update the IDs (`1`) with actual IDs from previous responses!

