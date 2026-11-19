import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import { createManufacturingRoutes } from "../routes/manufacturingRoutes";
import { ManufacturingController } from "../controllers/ManufacturingController";

describe("Manufacturing REST Routes", () => {
  let app: express.Express;

  const controller = {
    getMachines: vi.fn((_req, res) => {
      res.json(["Washer", "CMM"]);
    }),

    getMachineStatus: vi.fn((_req, res) => {
      res.json([
        {
          machineId: "Washer",
          property: "state",
          value: "Running",
        },
      ]);
    }),

    getMachineEventsByMachine: vi.fn((_req, res) => {
      res.json([
        {
          machineId: "Washer",
          values: { state: "Running", spindle: 1500 },
        },
      ]);
    }),
    getAllEvents: vi.fn((req, res) => res.json([])),
    getProductionStatus: vi.fn((_req, res) => {
      res.json({
        totalMachines: 2,
        stateCounts: {
          Running: 1,
          Idle: 1,
        },
      });
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(
      "/api",
      createManufacturingRoutes(
        controller as unknown as ManufacturingController,
      ),
    );
  });

  it("GET /api/machines should return all machines", async () => {
    const response = await request(app).get("/api/machines");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(["Washer", "CMM"]);
    expect(controller.getMachines).toHaveBeenCalled();
  });

  it("GET /api/machines/:machineId/status should return machine status", async () => {
    const response = await request(app).get("/api/machines/Washer/status");

    expect(response.status).toBe(200);
    expect(response.body[0].value).toBe("Running");
    expect(controller.getMachineStatus).toHaveBeenCalled();
  });

  it("GET /api/machines/:machineId/events should return machine events", async () => {
    const response = await request(app).get("/api/machines/Washer/events");

    expect(response.status).toBe(200);
    expect(response.body[0].values.spindle).toBe(1500);
    expect(controller.getMachineEventsByMachine).toHaveBeenCalled();
  });

  it("GET /api/production/status should return production status", async () => {
    const response = await request(app).get("/api/production/status");

    expect(response.status).toBe(200);
    expect(response.body.totalMachines).toBe(2);
    expect(controller.getProductionStatus).toHaveBeenCalled();
  });

  it("should return 404 for an unknown route", async () => {
    const response = await request(app).get("/api/unknown");

    expect(response.status).toBe(404);
  });
});
