import { Router } from "express";
import { MachineDataController } from "../controllers/MachineDataController";

export function createMachineDataRoutes(
  controller: MachineDataController,
): Router {
  const router = Router();
  router.post("/", controller.receiveMachineData);
  return router;
}
