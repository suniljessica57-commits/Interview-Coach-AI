import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import interviewsRouter from "./interviews";
import recommendationsRouter from "./recommendations";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireAuth);
router.use(studentsRouter);
router.use(interviewsRouter);
router.use(recommendationsRouter);

export default router;
