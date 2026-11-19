import { describe, it, expect, beforeEach } from "vitest";
import { VisualComponentAdapter } from "../adapters/VisualComponentAdapter";

describe("VisualComponentAdapter", () => {
  let adapter: VisualComponentAdapter;

  beforeEach(() => {
    adapter = new VisualComponentAdapter();
  });

  it("should save the first snapshot of a machine", () => {
    const events = adapter.updateData({
      resources: [
        {
          id: "VF-1 2",
          type: "Machine",
          state: "Busy",
          spindle: 200,
        },
      ],
    });

    expect(events).toHaveLength(1);

    expect(events[0]).toEqual(
      expect.objectContaining({
        source: "VisualComponents",
        machineId: "VF-1 2",
        values: { state: "Busy", spindle: 200 },
      }),
    );
  });

  it("should not save another snapshot when the state has not changed", () => {
    adapter.updateData({
      resources: [
        {
          id: "VF-1 2",
          type: "Machine",
          state: "Busy",
          spindle: 200,
        },
      ],
    });

    const events = adapter.updateData({
      resources: [
        {
          id: "VF-1 2",
          type: "Machine",
          state: "Busy",
          spindle: 300,
        },
      ],
    });

    expect(events).toHaveLength(0);
  });

  it("should save all properties in one event when the machine state changes", () => {
    adapter.updateData({
      resources: [
        {
          id: "VF-1 2",
          type: "Machine",
          state: "Busy",
          spindle: 200,
        },
      ],
    });

    const events = adapter.updateData({
      resources: [
        {
          id: "VF-1 2",
          type: "Machine",
          state: "Blocked",
          spindle: 400,
        },
      ],
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        machineId: "VF-1 2",
        values: { state: "Blocked", spindle: 400 },
      }),
    );
  });

  it("should track each machine independently", () => {
    adapter.updateData({
      resources: [
        {
          id: "Washer",
          type: "Machine",
          state: "Busy",
          spindle: 100,
        },
        {
          id: "CMM",
          type: "Machine",
          state: "Idle",
          spindle: 0,
        },
      ],
    });

    const events = adapter.updateData({
      resources: [
        {
          id: "Washer",
          type: "Machine",
          state: "Blocked",
          spindle: 100,
        },
        {
          id: "CMM",
          type: "Machine",
          state: "Idle",
          spindle: 200,
        },
      ],
    });

    expect(events).toHaveLength(1);
    expect(events[0].machineId).toBe("Washer");
  });
  it("should update current machine information even when the state has not changed", async () => {
    adapter.updateData({
      resources: [
        {
          id: "VF-1 2",
          type: "Machine",
          state: "Busy",
          spindle: 200,
        },
      ],
    });

    const events = adapter.updateData({
      resources: [
        {
          id: "VF-1 2",
          type: "Machine",
          state: "Busy",
          spindle: 300,
        },
      ],
    });

    const currentMachine = await adapter.getMachineStatus("VF-1 2");
    expect(events).toHaveLength(0);
    expect(currentMachine?.state).toBe("Busy");
    expect(currentMachine?.spindle).toBe(300);
  });
});
