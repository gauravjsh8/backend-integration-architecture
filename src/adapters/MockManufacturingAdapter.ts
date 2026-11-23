import { Machine } from "../interfaces/Machine";
import { ManufacturingDataSource } from "../interfaces/ManufacturingDataSource";

export class MockManufacturingAdapter implements ManufacturingDataSource {
  private machines: Machine[] = [
    {
      id: "VF-12",
      type: "Machine",
      state: "Busy",
      busyPercentage: 62.5,
      partsExited: 14,
      processTime: 30,
      door: false,
    },
    {
      id: "Washer",
      type: "Machine",
      state: "Idle",
      busyPercentage: 20,
      partsExited: 12,
      processTime: 15,
      door: false,
    },
  ];

  async getMachines(): Promise<Machine[]> {
    return this.machines;
  }

  async getMachineStatus(machineId: string): Promise<Machine | null> {
    return this.machines.find((machine) => machine.id === machineId) ?? null;
  }
}
