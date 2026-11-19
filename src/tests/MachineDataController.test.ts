import { describe, it, expect, beforeEach, vi } from "vitest";
import { Request, Response } from "express";
import { MachineDataController } from "../controllers/MachineDataController";
import { VisualComponentAdapter } from "../adapters/VisualComponentAdapter";
import { ManufacturingService } from "../services/ManufacturingService";

describe("MachineDataController", () => {
  let controller: MachineDataController;

  const adapter = {
    updateData: vi.fn(),
  };

  const manufacturingService = {
    addMachineEvents: vi.fn(),
  };

  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new MachineDataController(
      adapter as unknown as VisualComponentAdapter,
      manufacturingService as unknown as ManufacturingService,
    );

    req = { body: {} };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it("should receive and store valid machine data", async () => {
    const payload = {
      machineId: "Washer",
      properties: {
        state: "Running",
        spindle: 1500,
      },
    };

    const events = [
      {
        source: "VisualComponents",
        machineId: "Washer",
        timestamp: new Date(),
        values: { state: "Running", spindle: 1500 },
      },
    ];

    req.body = payload;

    adapter.updateData.mockReturnValue(events);
    manufacturingService.addMachineEvents.mockResolvedValue(undefined);

    await controller.receiveMachineData(req as Request, res as Response);

    expect(adapter.updateData).toHaveBeenCalledWith(payload);
    expect(manufacturingService.addMachineEvents).toHaveBeenCalledWith(events);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Machine data received successfully",
      events,
    });
  });

  it("should accept valid resources payload", async () => {
    const payload = {
      resources: [
        {
          id: "Washer",
          type: "Machine",
        },
      ],
    };

    req.body = payload;

    adapter.updateData.mockReturnValue([]);
    manufacturingService.addMachineEvents.mockResolvedValue(undefined);

    await controller.receiveMachineData(req as Request, res as Response);

    expect(adapter.updateData).toHaveBeenCalledWith(payload);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return 400 when machine data is invalid", async () => {
    req.body = {
      machineId: "",
      properties: {},
    };

    await controller.receiveMachineData(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(adapter.updateData).not.toHaveBeenCalled();
    expect(manufacturingService.addMachineEvents).not.toHaveBeenCalled();
  });

  it("should return 400 when neither resources nor valid machine data is provided", async () => {
    req.body = {};

    await controller.receiveMachineData(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(adapter.updateData).not.toHaveBeenCalled();
    expect(manufacturingService.addMachineEvents).not.toHaveBeenCalled();
  });

  it("should return 500 when saving machine events fails", async () => {
    const payload = {
      machineId: "Washer",
      properties: {
        state: "Running",
      },
    };

    req.body = payload;

    adapter.updateData.mockReturnValue([
      {
        source: "VisualComponents",
        machineId: "Washer",
        timestamp: new Date(),
        values: { state: "Running" },
      },
    ]);

    manufacturingService.addMachineEvents.mockRejectedValue(
      new Error("Database error"),
    );

    await controller.receiveMachineData(req as Request, res as Response);

    expect(adapter.updateData).toHaveBeenCalledWith(payload);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to process machine data.",
    });
  });
});
