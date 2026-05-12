import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import operatorsRouter from "./operators";
import bundlesRouter from "./bundles";
import ordersRouter from "./orders";
import usersRouter from "./users";
import statsRouter from "./stats";
import reviewsRouter from "./reviews";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(operatorsRouter);
router.use(bundlesRouter);
router.use(ordersRouter);
router.use(usersRouter);
router.use(statsRouter);
router.use(reviewsRouter);
router.use(settingsRouter);

export default router;
