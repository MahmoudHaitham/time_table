# How to Add Electives to Timetable Grid

## Overview
This guide explains how to add elective courses to classes and schedule them in the timetable grid.

## Step-by-Step Process

### **Step 1: Create Elective Courses**
1. Navigate to: `http://localhost:8000/admin/timetable/terms/{termId}`
2. Click **"Add Course"** button
3. Fill in:
   - **Course Code** (e.g., "ELEC101")
   - **Course Name** (e.g., "Advanced Programming")
   - ✅ **Check "Is Elective"** checkbox
   - Select components (Lecture, Section, Lab)
4. Click **"Add Course"**
5. You'll see a success alert: ✅ **"Course Added Successfully!"**

---

### **Step 2: Set Electives for the Term**
1. In the same term page (`/admin/timetable/terms/{termId}`)
2. Click the **"Electives"** tab
3. You'll see all courses marked as electives
4. **Select** the electives you want to make available for this term
5. Click **"Save Electives"**
6. You'll see a success alert: ✅ **"Electives Saved!"**

**Important:** Only electives set here will be available to assign to classes.

---

### **Step 3: Assign Electives to Classes**
1. Navigate to a class: `/admin/timetable/classes/{classId}`
2. Click **"Assign Courses"** button
3. You'll see:
   - ✅ **All core courses** (always available)
   - ✅ **Electives set for this term** (only if you set them in Step 2)
   - ❌ **Other electives** (not shown - they weren't set for this term)
4. **Select** the elective courses you want to assign
5. Click **"Assign Selected"**

**Visual Indicators:**
- Core courses: Normal border
- Elective courses: Purple border with "Elective" badge

---

### **Step 4: Create Components for Electives**
1. After assigning an elective to a class, you'll see it in the courses list
2. Click **"Create Components"** button for the elective
3. Answer the questions:
   - **"Does this course have a Section (S)?"** → Click Yes/No
   - **"Does this course have a Lab (LB)?"** → Click Yes/No
4. Components will be created automatically:
   - **Lecture (L)** - Always created
   - **Section (S)** - Created if you confirmed
   - **Lab (LB)** - Created if you confirmed

---

### **Step 5: Schedule Electives in Timetable Grid**
1. Click the **"Timetable Grid"** tab
2. Click on an **empty time slot** (day + slot combination)
3. A modal will appear:
   - **Select Course**: Choose the elective course
   - **Select Component Type**: Choose Lecture, Section, or Lab
   - **Room** (optional): Enter room number
   - **Instructor** (optional): Enter instructor name
4. Click **"Create Session"**
5. The elective session will appear in the timetable grid

**Rules:**
- Each component type (L, S, LB) can only have **one session per class**
- Electives appear in the timetable just like core courses
- You can schedule electives at any available time slot

---

## Example Workflow

```
1. Create Elective Course "ELEC101"
   ↓
2. Set "ELEC101" as elective for Term 5
   ↓
3. Assign "ELEC101" to Class "5_1" (System 180)
   ↓
4. Create Components (L, S, LB) for "ELEC101"
   ↓
5. Schedule Lecture: Monday, Slot 1
   ↓
6. Schedule Section: Tuesday, Slot 2
   ↓
7. Schedule Lab: Wednesday, Slot 3
   ↓
8. Done! Elective is now in the timetable
```

---

## Key Points

✅ **Electives must be set for the term first** before they can be assigned to classes
✅ **Electives work exactly like core courses** once assigned:
   - Can create components (L, S, LB)
   - Can schedule sessions
   - Appear in timetable grid
✅ **Visual distinction**: Electives have purple borders and "Elective" badges
✅ **Filtering**: Only electives set for the term appear in the assignment modal

---

## Troubleshooting

**Q: I don't see my elective in the "Assign Courses" modal**
- ✅ Make sure you set the elective for the term in the "Electives" tab
- ✅ Refresh the page and try again

**Q: I can't schedule my elective**
- ✅ Make sure you created components for the elective
- ✅ Check that you haven't already scheduled that component type

**Q: Elective doesn't appear in student view**
- ✅ Make sure the term is published
- ✅ Students with `term_number >= 6` can see electives
- ✅ Electives are filtered by system_type through classes

---

## Current Implementation

The system now:
1. ✅ Filters courses in assignment modal to show:
   - All core courses
   - Only electives set for the term
2. ✅ Shows visual indicators (purple border, "Elective" badge)
3. ✅ Allows scheduling electives just like core courses
4. ✅ Displays electives in timetable grid with same styling
