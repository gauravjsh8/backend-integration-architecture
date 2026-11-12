import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Db } from "mongodb";
import { createApp } from "../app";
import { TokenService } from "../services/TokenService";

describe("Manufacturing API Integration Tests", () => {
  const VC_KEY = "integration-test-vc-key";
  const MCP_KEY = "integration-test-mcp-key";

  const initializeBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: {
        name: "integration-test-client",
        version: "1.0.0",
      },
    },
  };

  // The audit log is written after the response, so wait a moment.
  const waitForAuditLog = () =>
    new Promise((resolve) => setTimeout(resolve, 200));

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let database: Db;
  let app: ReturnType<typeof createApp>;
  let tokenService: TokenService;

  let viewerToken: string;
  let operatorToken: string;
  let adminToken: string;

  async function initializeMcp(token: string) {
    const response = await request(app)
      .post("/mcp")
      .set("Authorization", `Bearer ${token}`)
      .set("Accept", "application/json, text/event-stream")
      .send(initializeBody);

    expect(response.status).toBe(200);
    expect(response.text).toContain("industrial-backend");

    return true;
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = "integration-test-secret-key";
    process.env.VC_API_KEY = VC_KEY;
    process.env.MCP_API_KEY = MCP_KEY;

    mongoServer = await MongoMemoryServer.create();

    mongoClient = new MongoClient(mongoServer.getUri());
    await mongoClient.connect();

    database = mongoClient.db("integration_test");

    app = createApp(database);
    tokenService = new TokenService();

    viewerToken = tokenService.generateToken({
      userId: "viewer-id",
      username: "viewer1",
      role: "viewer",
    });

    operatorToken = tokenService.generateToken({
      userId: "operator-id",
      username: "operator1",
      role: "operator",
    });

    adminToken = tokenService.generateToken({
      userId: "admin-id",
      username: "admin1",
      role: "admin",
    });
  });

  beforeEach(async () => {
    await database.collection("machine_events").deleteMany({});
    await database.collection("audit_logs").deleteMany({});
  });

  afterAll(async () => {
    await mongoClient.close();
    await mongoServer.stop();
  });

  // ---------------- REST API ----------------

  it("should reject requests without authentication", async () => {
    const response = await request(app).get("/api/machines");

    expect(response.status).toBe(401);
  });

  it("should allow a viewer to retrieve machines", async () => {
    // First, Visual Components submits machine data.
    const submitResponse = await request(app)
      .post("/api/machine-data")
      .set("x-api-key", VC_KEY)
      .send({
        machineId: "VF-12",
        properties: {
          state: "Busy",
          spindle: 1500,
        },
      });

    expect(submitResponse.status).toBe(200);

    // Then, a viewer retrieves the machines.
    const response = await request(app)
      .get("/api/machines")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toContainEqual(
      expect.objectContaining({
        id: "VF-12",
        state: "Busy",
      }),
    );
  });

  it("should allow an operator to retrieve machines", async () => {
    const response = await request(app)
      .get("/api/machines")
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(response.status).toBe(200);
  });

  it("should allow an admin to retrieve machines", async () => {
    const response = await request(app)
      .get("/api/machines")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
  });

  // ---------------- Machine data ingestion ----------------

  it("should allow the Visual Components client to submit machine data", async () => {
    const response = await request(app)
      .post("/api/machine-data")
      .set("x-api-key", VC_KEY)
      .send({
        machineId: "TEST-MACHINE",
        properties: {
          state: "Running",
          spindle: 1500,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Machine data received successfully");

    const storedEvents = await database
      .collection("machine_events")
      .find({ machineId: "TEST-MACHINE" })
      .toArray();

    expect(storedEvents.length).toBe(2);
  });

  it("should deny a viewer access to machine data ingestion", async () => {
    const response = await request(app)
      .post("/api/machine-data")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        machineId: "TEST-MACHINE",
        properties: {
          state: "Running",
        },
      });

    expect(response.status).toBe(403);
  });

  it("should deny human users (even admin) from submitting machine data", async () => {
    const response = await request(app)
      .post("/api/machine-data")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        machineId: "ADMIN-TEST-MACHINE",
        properties: {
          state: "Idle",
        },
      });

    expect(response.status).toBe(403);
  });

  // ---------------- MCP ----------------

  it("should reject MCP requests without authentication", async () => {
    const response = await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .send(initializeBody);

    expect(response.status).toBe(401);
  });

  it("should reject MCP requests with an invalid API key", async () => {
    const response = await request(app)
      .post("/mcp")
      .set("x-api-key", "invalid-api-key")
      .set("Accept", "application/json, text/event-stream")
      .send(initializeBody);

    expect(response.status).toBe(401);
  });

  it("should reject MCP requests with an invalid JWT", async () => {
    const response = await request(app)
      .post("/mcp")
      .set("Authorization", "Bearer invalid-token")
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      });

    expect(response.status).toBe(401);
  });

  it("should allow an authenticated viewer to access the MCP endpoint", async () => {
    const response = await request(app)
      .post("/mcp")
      .set("Authorization", `Bearer ${viewerToken}`)
      .set("Accept", "application/json, text/event-stream")
      .send(initializeBody);

    expect(response.status).toBe(200);
  });

  it("should allow MCP access with the MCP API key", async () => {
    const response = await request(app)
      .post("/mcp")
      .set("x-api-key", MCP_KEY)
      .set("Accept", "application/json, text/event-stream")
      .send(initializeBody);

    expect(response.status).toBe(200);
    expect(response.text).toContain("industrial-backend");
  });

  it("should list available MCP tools", async () => {
    await initializeMcp(viewerToken);

    const response = await request(app)
      .post("/mcp")
      .set("Authorization", `Bearer ${viewerToken}`)
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain("get_machine_events");
    expect(response.text).toContain("get_machine_status");
    expect(response.text).toContain("get_machine_property");
  });

  it("should execute get_machine_property through MCP", async () => {
    await database.collection("machine_events").insertOne({
      source: "Integration Test",
      machineId: "TEST-MCP-MACHINE",
      property: "spindle",
      value: 1500,
      timestamp: new Date(),
    });

    await initializeMcp(viewerToken);

    const response = await request(app)
      .post("/mcp")
      .set("Authorization", `Bearer ${viewerToken}`)
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "get_machine_property",
          arguments: {
            machineId: "TEST-MCP-MACHINE",
            property: "spindle",
          },
        },
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain("1500");
    expect(response.text).toContain("TEST-MCP-MACHINE");
  });

  it("should execute get_machine_events through MCP", async () => {
    await database.collection("machine_events").insertMany([
      {
        source: "Integration Test",
        machineId: "TEST-MCP-MACHINE",
        property: "state",
        value: "Running",
        timestamp: new Date(),
      },
      {
        source: "Integration Test",
        machineId: "TEST-MCP-MACHINE",
        property: "spindle",
        value: 1500,
        timestamp: new Date(),
      },
    ]);

    await initializeMcp(viewerToken);

    const response = await request(app)
      .post("/mcp")
      .set("Authorization", `Bearer ${viewerToken}`)
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "get_machine_events",
          arguments: {},
        },
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain("TEST-MCP-MACHINE");
    expect(response.text).toContain("Running");
    expect(response.text).toContain("1500");
  });

  it("should execute get_machine_status through MCP", async () => {
    // Visual Components submits current machine information.
    const submitResponse = await request(app)
      .post("/api/machine-data")
      .set("x-api-key", VC_KEY)
      .send({
        machineId: "TEST-MCP-MACHINE",
        properties: {
          state: "Running",
          spindle: 1500,
        },
        timeStamp: "2026-11-01T10:05:00Z",
      });

    expect(submitResponse.status).toBe(200);

    await initializeMcp(viewerToken);

    const response = await request(app)
      .post("/mcp")
      .set("Authorization", `Bearer ${viewerToken}`)
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "get_machine_status",
          arguments: {
            machineId: "TEST-MCP-MACHINE",
          },
        },
      });

    expect(response.status).toBe(200);
    expect(response.text).toContain("TEST-MCP-MACHINE");
    expect(response.text).toContain("Running");
    expect(response.text).toContain("1500");
    expect(response.text).not.toContain("1200");
  });

  // ---------------- RQ3: controlled access ----------------

  it("should reject the Visual Components key on the MCP endpoint", async () => {
    const response = await request(app)
      .post("/mcp")
      .set("x-api-key", VC_KEY)
      .set("Accept", "application/json, text/event-stream")
      .send(initializeBody);

    expect(response.status).toBe(403);
  });

  it("should reject the MCP key on the REST API", async () => {
    const response = await request(app)
      .get("/api/machines")
      .set("x-api-key", MCP_KEY);

    expect(response.status).toBe(403);
  });

  it("should reject the MCP key on machine data ingestion", async () => {
    const response = await request(app)
      .post("/api/machine-data")
      .set("x-api-key", MCP_KEY)
      .send({
        machineId: "AI-MACHINE",
        properties: {
          state: "Running",
        },
      });

    expect(response.status).toBe(403);
  });

  it("should reject the Visual Components key on the REST read API", async () => {
    const response = await request(app)
      .get("/api/machines")
      .set("x-api-key", VC_KEY);

    expect(response.status).toBe(403);
  });

  it("should reject invalid MCP tool input", async () => {
    await initializeMcp(viewerToken);

    const response = await request(app)
      .post("/mcp")
      .set("Authorization", `Bearer ${viewerToken}`)
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "get_machine_status",
          arguments: {
            machineId: "../$where",
          },
        },
      });

    expect(response.text).toMatch(/invalid/i);
  });

  it("should write an audit log entry for an MCP tool call", async () => {
    await initializeMcp(viewerToken);

    await request(app)
      .post("/mcp")
      .set("Authorization", `Bearer ${viewerToken}`)
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "get_machine_property",
          arguments: {
            machineId: "Washer",
            property: "state",
          },
        },
      });

    await waitForAuditLog();

    const entry = await database
      .collection("audit_logs")
      .findOne({ tool: "get_machine_property" });

    expect(entry).not.toBeNull();
    expect(entry?.client).toBe("viewer1");
    expect(entry?.mcpMethod).toBe("tools/call");
  });

  it("should write an audit log entry for a rejected MCP request", async () => {
    await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .send(initializeBody);

    await waitForAuditLog();

    const entry = await database
      .collection("audit_logs")
      .findOne({ path: "/mcp", status: 401 });

    expect(entry).not.toBeNull();
    expect(entry?.client).toBe("anonymous");
  });
});
