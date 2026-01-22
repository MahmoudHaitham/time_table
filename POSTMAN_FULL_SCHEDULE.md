# Complete POST Requests for Full Schedule (Term 5, Class 1)

## Base URL
```
http://localhost:5000/api
```

---

## 🔐 STEP 0: Authentication (REQUIRED FIRST!)

**You must authenticate before making any POST requests!**

### Option 1: Register a New Admin User (if you don't have an account)

**POST** `/auth/register`
```json
{
  "registration_number": "admin001",
  "password": "your_password_here",
  "full_name": "Admin User"
}
```

**Response**: Copy the `token` from the response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Option 2: Login (if you already have an account)

**POST** `/auth/login`
```json
{
  "registration_number": "admin001",
  "password": "your_password_here"
}
```

**Response**: Copy the `token` from the response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### ⚠️ IMPORTANT: Use the Token

After getting the token, add it to **ALL** subsequent requests:

**Headers (for all requests after login)**:
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN_HERE
```

**In Postman:**
1. Go to the **Authorization** tab
2. Select **Bearer Token** from the Type dropdown
3. Paste your token in the Token field
4. OR manually add header: `Authorization: Bearer YOUR_TOKEN_HERE`

---

## Headers (for all requests)
```
Content-Type: application/json
Authorization: Bearer YOUR_AUTH_TOKEN
```

---

## Step 1: Create Term (if doesn't exist)
**POST** `/terms`
```json
{
  "term_number": "5"
}
```
**Note**: Term ID = **2** (already exists)

---

## Step 2: Create Class "5_1" (if doesn't exist)
**POST** `/terms/2/classes`
```json
{
  "class_code": "5_1"
}
```
**Note**: Class ID = **3** (already exists)

---

## Step 3: Create All Courses

### Course 1: ECE3203 Computer Architecture
**POST** `/courses`
```json
{
  "code": "ECE3203",
  "name": "Computer Architecture",
  "is_elective": false,
  "components": ["L", "S", "LB"]
}
```
**Note**: Course ID = **6** (already exists)

### Course 2: ECE3105 JAVA Programming
**POST** `/courses`
```json
{
  "code": "ECE3105",
  "name": "JAVA Programming",
  "is_elective": false,
  "components": ["L", "S", "LB"]
}
```
**Note**: Course ID = **7** (already exists)

### Course 3: EEC2320 Electronics I
**POST** `/courses`
```json
{
  "code": "EEC2320",
  "name": "Electronics I",
  "is_elective": false,
  "components": ["L", "S"]
}
```
**Note**: Course ID = **8** (already exists)

### Course 4: EEE3208 Electrical Power and Machines
**POST** `/courses`
```json
{
  "code": "EEE3208",
  "name": "Electrical Power and Machines",
  "is_elective": false,
  "components": ["L", "S", "LB"]
}
```
**Note**: Course ID = **9** (already exists)

### Course 5: ECE4301 Computer Networks
**POST** `/courses`
```json
{
  "code": "ECE4301",
  "name": "Computer Networks",
  "is_elective": false,
  "components": ["L", "S", "LB"]
}
```
**Note**: Course ID = **10** (already exists)

### Course 6: EBA3206 Probability & Statistical Analysis
**POST** `/courses`
```json
{
  "code": "EBA3206",
  "name": "Probability & Statistical Analysis",
  "is_elective": false,
  "components": ["L", "S"]
}
```
**Note**: Course ID = **11** (already exists)

### Course 7: ECE3501 Database Systems
**POST** `/courses`
```json
{
  "code": "ECE3501",
  "name": "Database Systems",
  "is_elective": false,
  "components": ["L", "S", "LB"]
}
```
**Note**: Course ID = **12** (already exists)

---

## Step 4: Assign All Courses to Class
**POST** `/classes/3/courses`
```json
{
  "course_ids": [6, 7, 8, 9, 10, 11, 12]
}
```
**Note**: This will create class-course relationships. Save the `class_course_id` for each course from response.

---

## Step 5: Get Class Courses (to get class_course_ids)
**GET** `/classes/3/courses`

**Note**: Class Course IDs (from response):
- ECE3203 (course_id: 6) → class_course_id: **5**
- ECE3105 (course_id: 7) → class_course_id: **6**
- EEC2320 (course_id: 8) → class_course_id: **7**
- EEE3208 (course_id: 9) → class_course_id: **8**
- ECE4301 (course_id: 10) → class_course_id: **9**
- EBA3206 (course_id: 11) → class_course_id: **10**
- ECE3501 (course_id: 12) → class_course_id: **11**

---

## Step 6: Create Components for Each Course

### ECE3203 Components (L, S, LB)
**POST** `/class-courses/:classCourseId1/components`
```json
{
  "components": [
    {"component_type": "L"},
    {"component_type": "S"},
    {"component_type": "LB"}
  ]
}
```
**Note**: Save component IDs (e.g., `ece3203_L`, `ece3203_S`, `ece3203_LB`)

### ECE3105 Components (L, S, LB)
**POST** `/class-courses/:classCourseId2/components`
```json
{
  "components": [
    {"component_type": "L"},
    {"component_type": "S"},
    {"component_type": "LB"}
  ]
}
```
**Note**: Save component IDs (e.g., `ece3105_L`, `ece3105_S`, `ece3105_LB`)

### EEC2320 Components (L, S)
**POST** `/class-courses/:classCourseId3/components`
```json
{
  "components": [
    {"component_type": "L"},
    {"component_type": "S"}
  ]
}
```
**Note**: Save component IDs (e.g., `eec2320_L`, `eec2320_S`)

### EEE3208 Components (L, S, LB)
**POST** `/class-courses/:classCourseId4/components`
```json
{
  "components": [
    {"component_type": "L"},
    {"component_type": "S"},
    {"component_type": "LB"}
  ]
}
```
**Note**: Save component IDs (e.g., `eee3208_L`, `eee3208_S`, `eee3208_LB`)

### ECE4301 Components (L, S, LB)
**POST** `/class-courses/:classCourseId5/components`
```json
{
  "components": [
    {"component_type": "L"},
    {"component_type": "S"},
    {"component_type": "LB"}
  ]
}
```
**Note**: Save component IDs (e.g., `ece4301_L`, `ece4301_S`, `ece4301_LB`)

### EBA3206 Components (L, S)
**POST** `/class-courses/:classCourseId6/components`
```json
{
  "components": [
    {"component_type": "L"},
    {"component_type": "S"}
  ]
}
```
**Note**: Save component IDs (e.g., `eba3206_L`, `eba3206_S`)

### ECE3501 Components (L, S, LB)
**POST** `/class-courses/:classCourseId7/components`
```json
{
  "components": [
    {"component_type": "L"},
    {"component_type": "S"},
    {"component_type": "LB"}
  ]
}
```
**Note**: Save component IDs (e.g., `ece3501_L`, `ece3501_S`, `ece3501_LB`)

---

## Step 7: Create All Sessions

### Saturday Sessions

**POST** `/components/:ece3203_LB/sessions`
```json
{
  "day": "Saturday",
  "slot": 1,
  "room": "239",
  "instructor": null
}
```

**POST** `/components/:ece3203_S/sessions`
```json
{
  "day": "Saturday",
  "slot": 2,
  "room": "308",
  "instructor": null
}
```

**POST** `/components/:ece3105_LB/sessions`
```json
{
  "day": "Saturday",
  "slot": 3,
  "room": "310G",
  "instructor": null
}
```

---

### Sunday Sessions

**POST** `/components/:eec2320_L/sessions`
```json
{
  "day": "Sunday",
  "slot": 1,
  "room": "351",
  "instructor": null
}
```

**POST** `/components/:eec2320_S/sessions`
```json
{
  "day": "Sunday",
  "slot": 2,
  "room": "137",
  "instructor": null
}
```

**POST** `/components/:eee3208_LB/sessions`
```json
{
  "day": "Sunday",
  "slot": 3,
  "room": "201EE",
  "instructor": null
}
```

**POST** `/components/:eee3208_S/sessions`
```json
{
  "day": "Sunday",
  "slot": 4,
  "room": "349",
  "instructor": null
}
```

---

### Monday Sessions

**POST** `/components/:ece4301_L/sessions`
```json
{
  "day": "Monday",
  "slot": 1,
  "room": "137",
  "instructor": null
}
```

**POST** `/components/:ece3203_L/sessions`
```json
{
  "day": "Monday",
  "slot": 2,
  "room": "353",
  "instructor": null
}
```

**POST** `/components/:eba3206_S/sessions`
```json
{
  "day": "Monday",
  "slot": 4,
  "room": "435",
  "instructor": null
}
```

---

### Tuesday Sessions

**POST** `/components/:ece3105_L/sessions`
```json
{
  "day": "Tuesday",
  "slot": 1,
  "room": "353",
  "instructor": null
}
```

**POST** `/components/:eee3208_L/sessions`
```json
{
  "day": "Tuesday",
  "slot": 2,
  "room": "353",
  "instructor": null
}
```

**POST** `/components/:ece3501_L/sessions`
```json
{
  "day": "Tuesday",
  "slot": 3,
  "room": "353",
  "instructor": null
}
```

**POST** `/components/:ece4301_LB/sessions`
```json
{
  "day": "Tuesday",
  "slot": 4,
  "room": "110G",
  "instructor": null
}
```

---

### Wednesday Sessions

**POST** `/components/:eba3206_L/sessions`
```json
{
  "day": "Wednesday",
  "slot": 1,
  "room": "139",
  "instructor": null
}
```

**POST** `/components/:ece4301_S/sessions`
```json
{
  "day": "Wednesday",
  "slot": 2,
  "room": "444",
  "instructor": null
}
```

**POST** `/components/:ece3501_LB/sessions`
```json
{
  "day": "Wednesday",
  "slot": 3,
  "room": "310G",
  "instructor": null
}
```

---

## Complete Copy-Paste Format

### Setup (One-time)

```bash
# Note: Term ID = 2, Class ID = 3, Course IDs = 6,7,8,9,10,11,12 (already exist)

# 1. Assign Courses to Class (if not already assigned)
POST http://localhost:5000/api/classes/3/courses
{"course_ids": [6, 7, 8, 9, 10, 11, 12]}

# 2. Get Class Courses to get class_course_ids
GET http://localhost:5000/api/classes/3/courses
# Note the 'id' field for each course in the response - these are your class_course_ids
```

### Create Components (with actual class_course_ids)

**Class Course IDs** (from GET /classes/3/courses - Class "5_1"):
- ECE3203 (course_id: 6) → class_course_id: **5**
- ECE3105 (course_id: 7) → class_course_id: **6**
- EEC2320 (course_id: 8) → class_course_id: **7**
- EEE3208 (course_id: 9) → class_course_id: **8**
- ECE4301 (course_id: 10) → class_course_id: **9**
- EBA3206 (course_id: 11) → class_course_id: **10**
- ECE3501 (course_id: 12) → class_course_id: **11**

**Note**: Components are already created! Component IDs are:
- ECE3203: L=11, S=12, LB=13
- ECE3105: L=14, S=15, LB=16
- EEC2320: L=17, S=18
- EEE3208: L=19, S=20, LB=21
- ECE4301: L=22, S=23, LB=24
- EBA3206: L=25, S=26
- ECE3501: L=27, S=28, LB=29

---

## Class 5 (Class ID: 5, Class Code: "5_2")

**Class Course IDs** (from GET /classes/5/courses - Class "5_2"):
- CS111 (course_id: 5) → class_course_id: **13**
- ECE 4433 (course_id: 4) → class_course_id: **12**
- ECE3203 (course_id: 6) → class_course_id: **14**
- ECE3105 (course_id: 7) → class_course_id: **15**
- EEC2320 (course_id: 8) → class_course_id: **16**
- EEE3208 (course_id: 9) → class_course_id: **17**
- ECE4301 (course_id: 10) → class_course_id: **18**
- EBA3206 (course_id: 11) → class_course_id: **19**
- ECE3501 (course_id: 12) → class_course_id: **20**

**Note**: Components are already created! Component IDs are:
- CS111: L=32, S=33, LB=34
- ECE 4433: L=30, S=31
- ECE3203: L=35, S=36, LB=37
- ECE3105: L=38, S=39, LB=40
- EEC2320: L=41, S=42
- EEE3208: L=43, S=44, LB=45
- ECE4301: L=46, S=47, LB=48
- EBA3206: L=49, S=50
- ECE3501: L=51, S=52, LB=53

**If you need to recreate components for Class 3:**

```bash
# ECE3203 (class_course_id: 5)
POST http://localhost:5000/api/class-courses/5/components
{"components": [{"component_type": "L"}, {"component_type": "S"}, {"component_type": "LB"}]}

# ECE3105 (class_course_id: 6)
POST http://localhost:5000/api/class-courses/6/components
{"components": [{"component_type": "L"}, {"component_type": "S"}, {"component_type": "LB"}]}

# EEC2320 (class_course_id: 7)
POST http://localhost:5000/api/class-courses/7/components
{"components": [{"component_type": "L"}, {"component_type": "S"}]}

# EEE3208 (class_course_id: 8)
POST http://localhost:5000/api/class-courses/8/components
{"components": [{"component_type": "L"}, {"component_type": "S"}, {"component_type": "LB"}]}

# ECE4301 (class_course_id: 9)
POST http://localhost:5000/api/class-courses/9/components
{"components": [{"component_type": "L"}, {"component_type": "S"}, {"component_type": "LB"}]}

# EBA3206 (class_course_id: 10)
POST http://localhost:5000/api/class-courses/10/components
{"components": [{"component_type": "L"}, {"component_type": "S"}]}

# ECE3501 (class_course_id: 11)
POST http://localhost:5000/api/class-courses/11/components
{"components": [{"component_type": "L"}, {"component_type": "S"}, {"component_type": "LB"}]}
```

**If you need to recreate components for Class 5:**

```bash
# CS111 (class_course_id: 13)
POST http://localhost:5000/api/class-courses/13/components
{"components": [{"component_type": "L"}, {"component_type": "S"}, {"component_type": "LB"}]}

# ECE 4433 (class_course_id: 12)
POST http://localhost:5000/api/class-courses/12/components
{"components": [{"component_type": "L"}, {"component_type": "S"}]}

# ECE3203 (class_course_id: 14)
POST http://localhost:5000/api/class-courses/14/components
{"components": [{"component_type": "L"}, {"component_type": "S"}, {"component_type": "LB"}]}

# ECE3105 (class_course_id: 15)
POST http://localhost:5000/api/class-courses/15/components
{"components": [{"component_type": "L"}, {"component_type": "S"}, {"component_type": "LB"}]}

# EEC2320 (class_course_id: 16)
POST http://localhost:5000/api/class-courses/16/components
{"components": [{"component_type": "L"}, {"component_type": "S"}]}

# EEE3208 (class_course_id: 17)
POST http://localhost:5000/api/class-courses/17/components
{"components": [{"component_type": "L"}, {"component_type": "S"}, {"component_type": "LB"}]}

# ECE4301 (class_course_id: 18)
POST http://localhost:5000/api/class-courses/18/components
{"components": [{"component_type": "L"}, {"component_type": "S"}, {"component_type": "LB"}]}

# EBA3206 (class_course_id: 19)
POST http://localhost:5000/api/class-courses/19/components
{"components": [{"component_type": "L"}, {"component_type": "S"}]}

# ECE3501 (class_course_id: 20)
POST http://localhost:5000/api/class-courses/20/components
{"components": [{"component_type": "L"}, {"component_type": "S"}, {"component_type": "LB"}]}
```

### Create Sessions (with actual component IDs) ✅

**Component IDs are ready!** Use these exact IDs:

```bash
# Saturday
POST http://localhost:5000/api/components/13/sessions
{"day": "Saturday", "slot": 1, "room": "239", "instructor": null}

POST http://localhost:5000/api/components/12/sessions
{"day": "Saturday", "slot": 2, "room": "308", "instructor": null}

POST http://localhost:5000/api/components/16/sessions
{"day": "Saturday", "slot": 3, "room": "310G", "instructor": null}

# Sunday
POST http://localhost:5000/api/components/17/sessions
{"day": "Sunday", "slot": 1, "room": "351", "instructor": null}

POST http://localhost:5000/api/components/18/sessions
{"day": "Sunday", "slot": 2, "room": "137", "instructor": null}

POST http://localhost:5000/api/components/21/sessions
{"day": "Sunday", "slot": 3, "room": "201EE", "instructor": null}

POST http://localhost:5000/api/components/20/sessions
{"day": "Sunday", "slot": 4, "room": "349", "instructor": null}

# Monday
POST http://localhost:5000/api/components/22/sessions
{"day": "Monday", "slot": 1, "room": "137", "instructor": null}

POST http://localhost:5000/api/components/11/sessions
{"day": "Monday", "slot": 2, "room": "353", "instructor": null}

POST http://localhost:5000/api/components/26/sessions
{"day": "Monday", "slot": 4, "room": "435", "instructor": null}

# Tuesday
POST http://localhost:5000/api/components/14/sessions
{"day": "Tuesday", "slot": 1, "room": "353", "instructor": null}

POST http://localhost:5000/api/components/19/sessions
{"day": "Tuesday", "slot": 2, "room": "353", "instructor": null}

POST http://localhost:5000/api/components/27/sessions
{"day": "Tuesday", "slot": 3, "room": "353", "instructor": null}

POST http://localhost:5000/api/components/24/sessions
{"day": "Tuesday", "slot": 4, "room": "110G", "instructor": null}

# Wednesday
POST http://localhost:5000/api/components/25/sessions
{"day": "Wednesday", "slot": 1, "room": "139", "instructor": null}

POST http://localhost:5000/api/components/23/sessions
{"day": "Wednesday", "slot": 2, "room": "444", "instructor": null}

POST http://localhost:5000/api/components/29/sessions
{"day": "Wednesday", "slot": 3, "room": "310G", "instructor": null}
```

---

## Important Notes

1. **Known IDs**:
   - Term ID: **2**
   - Class ID: **3**
   - Course IDs: **6, 7, 8, 9, 10, 11, 12**

2. **Class Course IDs** (already known):
   - ECE3203 → **5**
   - ECE3105 → **6**
   - EEC2320 → **7**
   - EEE3208 → **8**
   - ECE4301 → **9**
   - EBA3206 → **10**
   - ECE3501 → **11**

3. **Component IDs** (already known - see table in Quick Reference section):
   - All component IDs are listed in the session creation requests below ✅

4. **All requests require authentication** (Bearer token in headers)

5. **Room and instructor** can be `null` or omitted if not needed

6. **Ready to use!** All IDs are filled in - just copy and paste the requests! 🎉

---

## Quick Reference: Component Mapping

**Known IDs:**
- Term ID: **2**
- Class ID: **3**
- Course IDs: ECE3203=**6**, ECE3105=**7**, EEC2320=**8**, EEE3208=**9**, ECE4301=**10**, EBA3206=**11**, ECE3501=**12**

**After creating components, map them like this:**

| Course (ID) | Component Type | Use For Session | Component ID |
|-------------|---------------|-----------------|--------------|
| ECE3203 (6) | LB | Saturday Slot 1 | **13** |
| ECE3203 (6) | S | Saturday Slot 2 | **12** |
| ECE3203 (6) | L | Monday Slot 2 | **11** |
| ECE3105 (7) | LB | Saturday Slot 3 | **16** |
| ECE3105 (7) | L | Tuesday Slot 1 | **14** |
| EEC2320 (8) | L | Sunday Slot 1 | **17** |
| EEC2320 (8) | S | Sunday Slot 2 | **18** |
| EEE3208 (9) | LB | Sunday Slot 3 | **21** |
| EEE3208 (9) | S | Sunday Slot 4 | **20** |
| EEE3208 (9) | L | Tuesday Slot 2 | **19** |
| ECE4301 (10) | L | Monday Slot 1 | **22** |
| ECE4301 (10) | LB | Tuesday Slot 4 | **24** |
| ECE4301 (10) | S | Wednesday Slot 2 | **23** |
| EBA3206 (11) | S | Monday Slot 4 | **26** |
| EBA3206 (11) | L | Wednesday Slot 1 | **25** |
| ECE3501 (12) | L | Tuesday Slot 3 | **27** |
| ECE3501 (12) | LB | Wednesday Slot 3 | **29** |

**All IDs Ready!** ✅
- Class Course IDs: 5, 6, 7, 8, 9, 10, 11
- Component IDs: 11-29 (see table above)
- Ready to create sessions using the component IDs in the requests below!

---

## Class 5 (Class ID: 5, Class Code: "5_2") - POST Requests for Sessions

**Ready-to-use POST requests for creating sessions in Class 5:**

```bash
# CS111 (course_id: 5) - Components: L=32, S=33, LB=34
POST http://localhost:5000/api/components/32/sessions
{"day": "Saturday", "slot": 1, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/33/sessions
{"day": "Saturday", "slot": 2, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/34/sessions
{"day": "Saturday", "slot": 3, "room": "TBD", "instructor": null}

# ECE 4433 (course_id: 4) - Components: L=30, S=31
POST http://localhost:5000/api/components/30/sessions
{"day": "Sunday", "slot": 1, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/31/sessions
{"day": "Sunday", "slot": 2, "room": "TBD", "instructor": null}

# ECE3203 (course_id: 6) - Components: L=35, S=36, LB=37
POST http://localhost:5000/api/components/35/sessions
{"day": "Monday", "slot": 1, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/36/sessions
{"day": "Monday", "slot": 2, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/37/sessions
{"day": "Monday", "slot": 3, "room": "TBD", "instructor": null}

# ECE3105 (course_id: 7) - Components: L=38, S=39, LB=40
POST http://localhost:5000/api/components/38/sessions
{"day": "Tuesday", "slot": 1, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/39/sessions
{"day": "Tuesday", "slot": 2, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/40/sessions
{"day": "Tuesday", "slot": 3, "room": "TBD", "instructor": null}

# EEC2320 (course_id: 8) - Components: L=41, S=42
POST http://localhost:5000/api/components/41/sessions
{"day": "Wednesday", "slot": 1, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/42/sessions
{"day": "Wednesday", "slot": 2, "room": "TBD", "instructor": null}

# EEE3208 (course_id: 9) - Components: L=43, S=44, LB=45
POST http://localhost:5000/api/components/43/sessions
{"day": "Thursday", "slot": 1, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/44/sessions
{"day": "Thursday", "slot": 2, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/45/sessions
{"day": "Thursday", "slot": 3, "room": "TBD", "instructor": null}

# ECE4301 (course_id: 10) - Components: L=46, S=47, LB=48
POST http://localhost:5000/api/components/46/sessions
{"day": "Sunday", "slot": 3, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/47/sessions
{"day": "Sunday", "slot": 4, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/48/sessions
{"day": "Monday", "slot": 4, "room": "TBD", "instructor": null}

# EBA3206 (course_id: 11) - Components: L=49, S=50
POST http://localhost:5000/api/components/49/sessions
{"day": "Tuesday", "slot": 4, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/50/sessions
{"day": "Wednesday", "slot": 3, "room": "TBD", "instructor": null}

# ECE3501 (course_id: 12) - Components: L=51, S=52, LB=53
POST http://localhost:5000/api/components/51/sessions
{"day": "Wednesday", "slot": 4, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/52/sessions
{"day": "Thursday", "slot": 4, "room": "TBD", "instructor": null}

POST http://localhost:5000/api/components/53/sessions
{"day": "Friday", "slot": 1, "room": "TBD", "instructor": null}
```

**Note**: Replace "TBD" with actual room numbers and update day/slot assignments as needed for your schedule. All component IDs are correct and ready to use!

