import express, { Request, Response, NextFunction } from "express";
import { Db } from "mongodb";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { UserModel } from "./models/User";
import { AuthService } from "./services/AuthService";
import { TokenService } from "./services/TokenService";
import { AuthController } from "./controllers/AuthController";
import { createAuthRoutes } from "./routes/authRoutes";

import { authenticateRequest } from "./middleware/authenticateRequest";
import { authorizeRole } from "./middleware/authorizeRole";
import { createAuditLogger } from "./middleware/auditLog";

import { ManufacturingDataSource } from "./interfaces/ManufacturingDataSource";
import { VisualComponentAdapter } from "./adapters/VisualComponentAdapter";
import { MockManufacturingAdapter } from "./adapters/MockManufacturingAdapter";
import { MachineEventRepository } from "./repositories/MachineEventRepository";
import { ManufacturingService } from "./services/ManufacturingService";
import { ManufacturingController } from "./controllers/ManufacturingController";
import { createManufacturingRoutes } from "./routes/manufacturingRoutes";
import { MachineDataController } from "./controllers/MachineDataController";
import { createMachineDataRoutes } from "./routes/machineDataRoutes";
import { createManufacturingMcpServer } from "./mcp/ManufacturingMcpServer";

export function createApp(database: Db) {
  const app = createMcpExpressApp();

  app.use(express.json());
  app.use(createAuditLogger(database));

  app.get("/", (req: Request, res: Response) => {
    res.send("Industrial Backend Integration API is running");
  });

  const userModel = new UserModel(database);
  const authService = new AuthService(userModel);
  const tokenService = new TokenService();
  const authController = new AuthController(authService, tokenService);

  const dataSourceType = process.env.DATA_SOURCE ?? "visual-components";

  const visualComponentAdapter = new VisualComponentAdapter();
  let dataSource: ManufacturingDataSource;

  if (dataSourceType === "mock") {
    dataSource = new MockManufacturingAdapter();
  } else if (dataSourceType === "visual-components") {
    dataSource = visualComponentAdapter;
  } else {
    throw new Error(
      `Unknown DATA_SOURCE "${dataSourceType}". Use "visual-components" or "mock".`,
    );
  }

  console.log(`Data source: ${dataSourceType}`);

  const eventRepository = new MachineEventRepository(database);

  const manufacturingService = new ManufacturingService(
    dataSource,
    eventRepository,
  );

  const manufacturingController = new ManufacturingController(
    manufacturingService,
  );

  const mcpHandler = createMcpHandler(() =>
    createManufacturingMcpServer(manufacturingService),
  );
  const nodeHandler = toNodeHandler(mcpHandler);

  app.use("/api/auth", createAuthRoutes(authController));

  if (dataSourceType === "visual-components") {
    const machineDataController = new MachineDataController(
      visualComponentAdapter,
      manufacturingService,
    );

    app.use(
      "/api/machine-data",
      authenticateRequest,
      authorizeRole([], "machine-data:write"),
      createMachineDataRoutes(machineDataController),
    );
  }

  app.all(
    "/mcp",
    authenticateRequest,
    authorizeRole([], "mcp:access"),
    (req, res) => {
      void nodeHandler(req, res, req.body);
    },
  );

  app.use(
    "/api",
    authenticateRequest,
    authorizeRole(["viewer", "operator", "admin"]),
    createManufacturingRoutes(manufacturingController),
  );
  app.use(
    (
      err: { type?: string },
      req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      if (err.type === "entity.parse.failed") {
        res.status(400).json({ message: "Invalid JSON body." });
        return;
      }
      console.error("Unhandled error:", err);
      res.status(500).json({ message: "Internal server error." });
    },
  );
  return app;
}
