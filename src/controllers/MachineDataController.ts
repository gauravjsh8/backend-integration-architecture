import { Request, Response } from "express";

import { VisualComponentAdapter } from "../adapters/VisualComponentAdapter";
import { MachineDataRequest } from "../interfaces/MachineDataRequest";
import { ManufacturingService } from "../services/ManufacturingService";

export class MachineDataController {
  constructor(
    private visualComponentAdapter: VisualComponentAdapter,
    private manufacturingService: ManufacturingService,
  ) {}
  receiveMachineData = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = req.body as MachineDataRequest;
      console.log("Received request body:", JSON.stringify(data));

      if (
        !data ||
        (!(
          typeof data.machineId === "string" &&
          data.machineId.trim() &&
          data.properties &&
          typeof data.properties === "object" &&
          !Array.isArray(data.properties)
        ) &&
          !(
            Array.isArray(data.resources) &&
            data.resources.every(
              (resource) =>
                resource &&
                typeof resource.id === "string" &&
                resource.id.trim() &&
                typeof resource.type === "string",
            )
          ))
      ) {
        res.status(400).json({
          message:
            "Invalid machine data. Expected resources or machineId and properties.",
        });
        return;
      }

      const events = this.visualComponentAdapter.updateData(data);
      await this.manufacturingService.addMachineEvents(events);
      console.log("Received and stored events:", events);
      res.status(200).json({
        message: "Machine data received successfully",
        events,
      });
    } catch (error) {
      console.error("Error processing machine data: ", error);
      res.status(500).json({ message: "Failed to process machine data." });
    }
  };
}
