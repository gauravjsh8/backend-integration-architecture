export interface MachineEvent {
  source: string;
  machineId: string;
  property: string;
  value: boolean | number | string;
  timestamp: Date;
}
