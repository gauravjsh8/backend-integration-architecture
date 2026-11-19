import { describe, it, expect, beforeEach, vi } from "vitest";

import { ManufacturingService } from "../services/ManufacturingService";
import { ManufacturingDataSource } from "../interfaces/ManufacturingDataSource";
import { EventRepository } from "../interfaces/EventRepository";
import { MachineEvent, MachinePropertyValue } from "../interfaces/MachineEvent";
import { Machine } from "../interfaces/Machine";

describe("ManufacturingService", () => {
  let service: ManufacturingService;

  let mockDataSource: {
    getMachines: ReturnType<typeof vi.fn>;
    getMachineStatus: ReturnType<typeof vi.fn>;
  };

  let mockRepository: {
    getAll: ReturnType<typeof vi.fn>;
    getByMachine: ReturnType<typeof vi.fn>;
    findLatestProperty: ReturnType<typeof vi.fn>;
    saveMany: ReturnType<typeof vi.fn>;
  };

  const sampleMachines: Machine[] = [
    { id: "Washer", type: "Machine", state: "Running", spindle: 1500 },
    { id: "CMM", type: "Machine", state: "Busy" },
  ];

  const sampleEvents: MachineEvent[] = [
    {
      source: "VisualComponents",
      machineId: "Washer",
      timestamp: new Date("2026-11-01T11:00:00Z"),
      values: { state: "Running", spindle: 1500 },
    },
  ];

  const samplePropertyValue: MachinePropertyValue = {
    machineId: "Washer",
    property: "spindle",
    value: 1500,
    timestamp: new Date("2026-11-01T11:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDataSource = {
      getMachines: vi.fn().mockResolvedValue(sampleMachines),
      getMachineStatus: vi
        .fn()
        .mockImplementation(async (machineId: string) => {
          return (
            sampleMachines.find((machine) => machine.id === machineId) ?? null
          );
        }),
    };

    mockRepository = {
      getAll: vi.fn().mockResolvedValue(sampleEvents),
      getByMachine: vi.fn().mockResolvedValue(sampleEvents),
      findLatestProperty: vi.fn().mockResolvedValue(samplePropertyValue),
      saveMany: vi.fn().mockResolvedValue(undefined),
    };

    service = new ManufacturingService(
      mockDataSource as unknown as ManufacturingDataSource,
      mockRepository as unknown as EventRepository,
    );
  });

  it("should retrieve events from the repository", async () => {
    const events = await service.getMachineEvents();

    expect(events).toEqual(sampleEvents);
    expect(mockRepository.getAll).toHaveBeenCalledOnce();
  });

  it("should pass the event limit to the repository", async () => {
    await service.getMachineEvents(5);

    expect(mockRepository.getAll).toHaveBeenCalledWith(5);
  });

  it("should return an empty event list when the repository is empty", async () => {
    mockRepository.getAll.mockResolvedValue([]);

    const events = await service.getMachineEvents();

    expect(events).toEqual([]);
  });

  it("should return all machines from the data source", async () => {
    const machines = await service.getMachines();

    expect(machines).toEqual(sampleMachines);
    expect(mockDataSource.getMachines).toHaveBeenCalledOnce();
  });

  it("should get the events of one machine from the repository", async () => {
    const events = await service.getMachineEventsByMachine("Washer");

    expect(events).toEqual(sampleEvents);
    expect(mockRepository.getByMachine).toHaveBeenCalledWith(
      "Washer",
      undefined,
    );
  });

  it("should return the current information for a machine", async () => {
    const status = await service.getMachineStatus("Washer");

    expect(status?.id).toBe("Washer");
    expect(status?.state).toBe("Running");
    expect(mockDataSource.getMachineStatus).toHaveBeenCalledWith("Washer");
  });

  it("should return null when the machine does not exist", async () => {
    const status = await service.getMachineStatus("Unknown");

    expect(status).toBeNull();
  });

  it("should get the latest property value from the repository", async () => {
    const property = await service.getMachineProperty("Washer", "SPINDLE");

    expect(property?.value).toBe(1500);
    expect(mockRepository.findLatestProperty).toHaveBeenCalledWith(
      "Washer",
      "SPINDLE",
    );
  });

  it("should return null for a missing machine property", async () => {
    mockRepository.findLatestProperty.mockResolvedValue(null);

    const property = await service.getMachineProperty("Washer", "temperature");

    expect(property).toBeNull();
  });

  it("should calculate production status", async () => {
    const result = await service.getProductionStatus();

    expect(result.totalMachines).toBe(2);
    expect(result.stateCounts).toEqual({ Running: 1, Busy: 1 });
    expect(result.machines).toHaveLength(2);
  });

  it("should save machine events through the repository", async () => {
    await service.addMachineEvents(sampleEvents);

    expect(mockRepository.saveMany).toHaveBeenCalledWith(sampleEvents);
  });
});
