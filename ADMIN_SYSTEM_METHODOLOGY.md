# Admin Methodology: Adding Terms and Classes with Different System Types

## Overview
This guide explains how to add academic terms and classes with different system types (180, 160, 140) through the admin interface.

## Step-by-Step Process

### **Step 1: Access Admin Timetable Page**
- Navigate to: `http://localhost:8000/admin/timetable`
- You'll see:
  - List of existing terms
  - "Create Term" button
  - "Courses" button (to manage courses)
  - "Logout" button

---

### **Step 2: Create a New Term**
1. Click the **"Create Term"** button (top right)
2. A modal will appear
3. Enter the **Term Number** (e.g., "5", "2024-2025-1", etc.)
4. Click **"Create"**
5. You'll be automatically redirected to the term details page

**Important Notes:**
- A term supports **ALL three systems** (180, 160, 140)
- The term itself does NOT have a system_type
- You can create multiple classes with the same class_code but different system_types within the same term

---

### **Step 3: Create Classes for Different Systems**

After creating a term, you'll be on the term details page (`/admin/timetable/terms/{termId}`).

#### **3.1: Create Class for System 180**
1. Click **"Create Class"** button
2. Enter **Class Number** (e.g., "1")
   - The system will auto-generate: `{term_number}_1` (e.g., "5_1")
3. **Select System Type**: Choose **180**
4. Click **"Create"**

#### **3.2: Create Class for System 160**
1. Click **"Create Class"** button again
2. Enter the **same Class Number** (e.g., "1")
   - The system will auto-generate: `{term_number}_1` (same as before)
3. **Select System Type**: Choose **160**
4. Click **"Create"**

#### **3.3: Create Class for System 140**
1. Click **"Create Class"** button again
2. Enter the **same Class Number** (e.g., "1")
   - The system will auto-generate: `{term_number}_1` (same as before)
3. **Select System Type**: Choose **140**
4. Click **"Create"**

**Result:**
- You now have **3 classes** with the same `class_code` ("5_1") but different `system_type` values:
  - Class "5_1" → System 180
  - Class "5_1" → System 160
  - Class "5_1" → System 140

---

### **Step 4: Assign Courses to Classes**

For each class you created:

1. Click on the **class card** (e.g., "5_1")
2. You'll be redirected to: `/admin/timetable/classes/{classId}`
3. Click the **"Assign Courses"** button
4. Select the courses you want to assign to this class
5. Click **"Assign Selected"**

**Important:**
- Courses are **filtered by system** through classes
- The same course can be assigned to multiple classes with different system_types
- When students select System 180, they'll only see courses from classes with `system_type = 180`

---

### **Step 5: Create Components for Courses**

After assigning courses:

1. For each course, click **"Create Components"**
2. The system will ask:
   - Does this course have a Section (S)? → Click OK if yes
   - Does this course have a Lab (LB)? → Click OK if yes
3. Components will be created automatically:
   - **Lecture (L)** - Always created
   - **Section (S)** - Created if you confirmed
   - **Lab (LB)** - Created if you confirmed

---

### **Step 6: Schedule Sessions (Timetable)**

1. Click the **"Timetable Grid"** tab
2. Click on an **empty time slot** (day + slot combination)
3. A modal will appear:
   - Select the **Course** (Subject)
   - Select the **Component Type** (Lecture, Section, or Lab)
   - Enter **Room** (optional)
   - Enter **Instructor** (optional)
4. Click **"Create Session"**

**Rules:**
- Each component type (L, S, LB) can only have **one session per class**
- You cannot schedule overlapping sessions

---

### **Step 7: Manage Electives (Optional)**

1. Go back to the term details page
2. Click the **"Electives"** tab
3. Select which elective courses are available for this term
4. Click **"Save Electives"**

**Elective Rules:**
- Elective courses are visible to students with `term_number >= 6`
- Maximum 2 elective courses can be selected per student
- Electives are filtered by system through classes

---

### **Step 8: Validate and Publish**

1. Click the **"Validation"** tab
2. Click the **"Validate"** button
3. Review validation results:
   - ✅ Green = All validations passed
   - ❌ Red = Errors found (fix them before publishing)
4. If validation passes, click **"Publish"** button
5. Once published, the term becomes visible to students

---

## Example Workflow

### Creating Term 5 with All Three Systems:

```
1. Create Term "5"
   ↓
2. Create Class "5_1" with system_type = 180
   ↓
3. Create Class "5_1" with system_type = 160
   ↓
4. Create Class "5_1" with system_type = 140
   ↓
5. For each class:
   - Assign courses
   - Create components
   - Schedule sessions
   ↓
6. Set electives (if any)
   ↓
7. Validate
   ↓
8. Publish
```

---

## Key Points to Remember

✅ **Term**: No system_type (supports all systems)
✅ **Class**: Has system_type (180, 160, or 140)
✅ **Course**: No system_type (filtered through classes)
✅ **Same class_code**: Can exist multiple times with different system_types in the same term

---

## Current Implementation Status

⚠️ **Note**: The system_type selection in the class creation modal needs to be added to the frontend. Currently, the backend supports it, but the UI needs to be updated to include a system_type dropdown when creating classes.
