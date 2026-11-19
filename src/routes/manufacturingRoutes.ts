import { Router } from "express";
import { ManufacturingController } from "../controllers/ManufacturingController";

export function createManufacturingRoutes(
  controller: ManufacturingController,
): Router {
  const router = Router();

  router.get("/machines", controller.getMachines);

  router.get("/machines/:machineId/status", controller.getMachineStatus);

  router.get(
    "/machines/:machineId/events",
    controller.getMachineEventsByMachine,
  );
  router.get("/events", controller.getAllEvents);
  router.get("/production/status", controller.getProductionStatus);

  return router;
}
