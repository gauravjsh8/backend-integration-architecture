export interface Machine {
  id: string;
  type?: string;
  [property: string]: unknown;
}
