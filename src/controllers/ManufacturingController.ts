import { Request, Response } from "express";
import { ManufacturingService } from "../services/ManufacturingService";

const DEFAULT_EVENT_LIMIT = 20;
const MAX_EVENT_LIMIT = 100;

function parseLimit(value: unknown): number | null {
  if (value === undefined) {
    return DEFAULT_EVENT_LIMIT;
  }

  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_EVENT_LIMIT) {
    return null;
  }

  return limit;
}

export class ManufacturingController {
  constructor(private manufacturingService: ManufacturingService) {}

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
      const limit = parseLimit(req.query?.limit);
      const machineId = String(req.params.machineId);
      if (limit === null) {
        res.status(400).json({
          message: `limit must be a whole number from 1 to ${MAX_EVENT_LIMIT}.`,
        });
        return;
      }
      const events = await this.manufacturingService.getMachineEventsByMachine(
        machineId,
        limit,
      );

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
  getAllEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseLimit(req.query?.limit);

      if (limit == null) {
        res.status(400).json({
          message: `limit must be a whole number from 1 to ${MAX_EVENT_LIMIT}.`,
        });
        return;
      }

      const events = await this.manufacturingService.getMachineEvents(limit);
      res.json(events);
    } catch (error) {
      console.error("Error retrieving events:", error);
      res.status(500).json({
        message: "Failed to retrieve events",
      });
    }
  };
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
