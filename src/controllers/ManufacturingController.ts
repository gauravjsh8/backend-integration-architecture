import { Request, Response } from "express";
import { ManufacturingService } from "../services/ManufacturingService";

export class ManufacturingController {
  constructor(private manufacturingService: ManufacturingService) {}

  // GET /api/machines
  getMachines = async (req: Request, res: Response): Promise<void> => {
    try {
      const machines = await this.manufacturingService.getMachines();
      res.json(machines);
    } catch (error) {
      console.error("Error retrieving machines:", error);
      res.status(500).json({
        message: "Failed to retrieve machines",
      });
    }
  };

  // GET /api/machines/:machineId/status
  getMachineStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const machineId = String(req.params.machineId);
      const status =
        await this.manufacturingService.getMachineStatus(machineId);

      if (!status) {
        res.status(404).json({
          message: `No status found for machine ${machineId}`,
        });
        return;
      }

      res.json(status);
    } catch (error) {
      console.error("Error retrieving machine status:", error);
      res.status(500).json({
        message: "Failed to retrieve machine status",
      });
    }
  };

  // GET /api/machines/:machineId/events
  getMachineEventsByMachine = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const machineId = String(req.params.machineId);
      const events =
        await this.manufacturingService.getMachineEventsByMachine(machineId);

      if (events.length === 0) {
        res.status(404).json({
          message: `No events found for machine ${machineId}`,
        });
        return;
      }

      res.json(events);
    } catch (error) {
      console.error("Error retrieving machine events:", error);
      res.status(500).json({
        message: "Failed to retrieve machine events",
      });
    }
  };

  // GET /api/production/status
  getProductionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const productionStatus =
        await this.manufacturingService.getProductionStatus();

      res.json(productionStatus);
    } catch (error) {
      console.error("Error retrieving production status:", error);
      res.status(500).json({
        message: "Failed to retrieve production status",
      });
    }
  };
}
