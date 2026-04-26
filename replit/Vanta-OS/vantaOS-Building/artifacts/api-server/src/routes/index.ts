import { Router, type IRouter } from "express";
import healthRouter from "./health";
import nodesRouter from "./nodes";
import proxyRouter from "./proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(nodesRouter);
router.use(proxyRouter);

export default router;
