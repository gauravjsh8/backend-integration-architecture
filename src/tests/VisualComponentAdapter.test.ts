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

    expect(events).toHaveLength(2);

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          machineId: "VF-1 2",
          property: "state",
          value: "Busy",
        }),
        expect.objectContaining({
          machineId: "VF-1 2",
          property: "spindle",
          value: 200,
        }),
      ]),
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

  it("should save all properties when the machine state changes", () => {
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

    expect(events).toHaveLength(2);

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          machineId: "VF-1 2",
          property: "state",
          value: "Blocked",
        }),
        expect.objectContaining({
          machineId: "VF-1 2",
          property: "spindle",
          value: 400,
        }),
      ]),
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

    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.machineId === "Washer")).toBe(true);
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
