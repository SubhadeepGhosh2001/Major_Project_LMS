import express from "express";
import multer from "multer";
import {
  createCourse,
  deleteCourse,
  getCourse,
  listCourses,
  updateCourse,
  getUploadVideoUrl,
} from "../controllers/courseController";
import { requireAuth } from "@clerk/express";
import { requireTeacher } from "../middlewares/requireTeacher";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", listCourses);
router.post("/", requireAuth(), requireTeacher, createCourse);

router.get("/:courseId", getCourse);
router.put(
  "/:courseId",
  requireAuth(),
  requireTeacher,
  upload.single("image"),
  updateCourse
);
router.delete("/:courseId", requireAuth(), requireTeacher, deleteCourse);

router.post(
  "/:courseId/sections/:sectionId/chapters/:chapterId/get-upload-url",
  requireAuth(),
  requireTeacher,
  getUploadVideoUrl
);

export default router;
