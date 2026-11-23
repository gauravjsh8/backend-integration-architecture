import { McpServer } from "@modelcontextprotocol/server";
import { ManufacturingService } from "../services/ManufacturingService";
import * as z from "zod/v4";

const machineIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[A-Za-z0-9 _-]+$/, "Machine ID contains invalid characters.")
  .describe(
    "The machine identifier, for example Washer, CMM, VF-1 1 or VF-1 2.",
  );

const propertySchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[A-Za-z0-9_]+$/, "Property name contains invalid characters.")
  .describe(
    "The property name, for example busyPercentage, partsCurrent, brokenPercentage, state or processTime.",
  );

const DEFAULT_EVENT_LIMIT = 20;

export function createManufacturingMcpServer(
  manufacturingService: ManufacturingService,
): McpServer {
  const server = new McpServer({
    name: "industrial-backend",
    version: "1.0.0",
  });

  server.registerTool(
    "get_machine_events",
    {
      description:
        "Retrieve recent historical machine events from the database. Each event is one snapshot of all values of a machine, saved when its state changed. Read-only.",
      inputSchema: z.object({
        machineId: machineIdSchema.optional(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of events to return (1-100, default 20)."),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ machineId, limit }) => {
      const maxEvents = limit ?? DEFAULT_EVENT_LIMIT;

      const recentEvents = machineId
        ? await manufacturingService.getMachineEventsByMachine(
            machineId,
            maxEvents,
          )
        : await manufacturingService.getMachineEvents(maxEvents);

      return {
        content: [
          { type: "text", text: JSON.stringify(recentEvents, null, 2) },
        ],
      };
    },
  );

  server.registerTool(
    "get_machine_status",
    {
      description:
        "Retrieve the current information and properties of a specific manufacturing machine. Read-only.",
      inputSchema: z.object({ machineId: machineIdSchema }),
      annotations: { readOnlyHint: true },
    },
    async ({ machineId }) => {
      const status = await manufacturingService.getMachineStatus(machineId);

      if (!status) {
        return {
          content: [
            { type: "text", text: `Machine '${machineId}' was not found.` },
          ],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_machine_property",
    {
      description:
        "Retrieve the latest stored historical value of a specific property from a manufacturing machine. Values are stored only when the machine state changes, so for current values use get_machine_status. Read-only.",
      inputSchema: z.object({
        machineId: machineIdSchema,
        property: propertySchema,
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ machineId, property }) => {
      const event = await manufacturingService.getMachineProperty(
        machineId,
        property,
      );

      return {
        content: [
          {
            type: "text",
            text: event
              ? JSON.stringify(event, null, 2)
              : `Property '${property}' was not found for machine '${machineId}'.`,
          },
        ],
      };
    },
  );
  server.registerTool(
    "get_production_status",
    {
      description:
        "Retrieve a summary of the current production: the number of machines, how many are in each state, and the state of each machine. Read-only.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const status = await manufacturingService.getProductionStatus();

      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
      };
    },
  );

  return server;
}
