export type EventValue = boolean | number | string;

export interface MachineEvent {
  source: string;
  machineId: string;
  timestamp: Date;
  values: Record<string, EventValue>;
}

export interface MachinePropertyValue {
  machineId: string;
  property: string;
  value: EventValue;
  timestamp: Date;
}
