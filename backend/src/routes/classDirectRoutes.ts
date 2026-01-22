import { Router } from "express";
import { deleteClass } from "../controllers/classController";

// Direct routes for class operations (not nested under terms)
const router = Router();

// DELETE /classes/:id - Delete a class directly by ID
router.delete("/:id", deleteClass);

export default router;
