import { Router, type IRouter } from "express";
import {
  startNode,
  stopNode,
  getStatusAll,
  getDetails,
  type NodeName,
} from "../lib/nodeManager";

const router: IRouter = Router();

const VALID: NodeName[] = ["tor", "i2pd", "yggdrasil", "freenet"];

function isValid(n: string): n is NodeName {
  return (VALID as string[]).includes(n);
}

router.get("/nodes/status", async (_req, res) => {
  res.json(await getStatusAll());
});

router.get("/nodes/:name", async (req, res) => {
  const { name } = req.params;
  if (!isValid(name)) return res.status(400).json({ error: "invalid node" });
  res.json(await getDetails(name));
});

router.post("/nodes/:name/start", async (req, res) => {
  const { name } = req.params;
  if (!isValid(name)) return res.status(400).json({ error: "invalid node" });
  const r = await startNode(name);
  res.json(r);
});

router.post("/nodes/:name/stop", async (req, res) => {
  const { name } = req.params;
  if (!isValid(name)) return res.status(400).json({ error: "invalid node" });
  const r = await stopNode(name);
  res.json(r);
});

export default router;
