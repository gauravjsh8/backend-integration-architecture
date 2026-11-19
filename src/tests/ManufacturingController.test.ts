import { describe, it, expect, beforeEach, vi } from "vitest";
import { Request, Response } from "express";
import { ManufacturingController } from "../controllers/ManufacturingController";
import { ManufacturingService } from "../services/ManufacturingService";
import { MachineEvent } from "../interfaces/MachineEvent";
import { Machine } from "../interfaces/Machine";

describe("ManufacturingController", () => {
  let controller: ManufacturingController;

  let manufacturingService: {
    getMachines: ReturnType<typeof vi.fn>;
    getMachineStatus: ReturnType<typeof vi.fn>;
    getMachineEventsByMachine: ReturnType<typeof vi.fn>;
    getProductionStatus: ReturnType<typeof vi.fn>;
  };

  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    manufacturingService = {
      getMachines: vi.fn(),
      getMachineStatus: vi.fn(),
      getMachineEventsByMachine: vi.fn(),
      getProductionStatus: vi.fn(),
    };

    controller = new ManufacturingController(
      manufacturingService as unknown as ManufacturingService,
    );

    req = { params: {} };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it("should return all machines", async () => {
    const machines: Machine[] = [
      { id: "Washer", type: "Machine", state: "Running" },
      { id: "CMM", type: "Machine", state: "Idle" },
    ];

    manufacturingService.getMachines.mockResolvedValue(machines);

    await controller.getMachines(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith(machines);
  });

  it("should return machine status", async () => {
    const status: Machine = {
      id: "Washer",
      type: "Machine",
      state: "Running",
      spindle: 1500,
    };

    req.params = { machineId: "Washer" };
    manufacturingService.getMachineStatus.mockResolvedValue(status);

    await controller.getMachineStatus(req as Request, res as Response);

    expect(manufacturingService.getMachineStatus).toHaveBeenCalledWith(
      "Washer",
    );
    expect(res.json).toHaveBeenCalledWith(status);
  });

  it("should return 404 when machine status is empty", async () => {
    req.params = { machineId: "Unknown" };
    manufacturingService.getMachineStatus.mockResolvedValue(null);

    await controller.getMachineStatus(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("should return machine events", async () => {
    const events: MachineEvent[] = [
      {
        source: "VisualComponents",
        machineId: "Washer",
        timestamp: new Date(),
        values: { state: "Running", spindle: 1500 },
      },
    ];

    req.params = { machineId: "Washer" };
    manufacturingService.getMachineEventsByMachine.mockResolvedValue(events);

    await controller.getMachineEventsByMachine(req as Request, res as Response);

    expect(manufacturingService.getMachineEventsByMachine).toHaveBeenCalledWith(
      "Washer",
      20,
    );
    expect(res.json).toHaveBeenCalledWith(events);
  });

  it("should return 404 when machine events are empty", async () => {
    req.params = { machineId: "Unknown" };
    manufacturingService.getMachineEventsByMachine.mockResolvedValue([]);

    await controller.getMachineEventsByMachine(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("should return production status", async () => {
    const productionStatus = {
      totalMachines: 2,
      stateCounts: { Running: 1, Idle: 1 },
      machines: [
        { machineId: "Washer", state: "Running" },
        { machineId: "CMM", state: "Idle" },
      ],
    };

    manufacturingService.getProductionStatus.mockResolvedValue(
      productionStatus,
    );

    await controller.getProductionStatus(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith(productionStatus);
  });

  it("should return 500 when retrieving machines fails", async () => {
    manufacturingService.getMachines.mockRejectedValue(
      new Error("Database error"),
    );

    await controller.getMachines(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("should return 500 when retrieving machine status fails", async () => {
    req.params = { machineId: "Washer" };

    manufacturingService.getMachineStatus.mockRejectedValue(
      new Error("Database error"),
    );

    await controller.getMachineStatus(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("should return 500 when retrieving machine events fails", async () => {
    req.params = { machineId: "Washer" };

    manufacturingService.getMachineEventsByMachine.mockRejectedValue(
      new Error("Database error"),
    );

    await controller.getMachineEventsByMachine(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("should return 500 when retrieving production status fails", async () => {
    manufacturingService.getProductionStatus.mockRejectedValue(
      new Error("Database error"),
    );

    await controller.getProductionStatus(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
