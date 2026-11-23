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

  async function initializeMcp() {
    const response = await request(app)
      .post("/mcp")
      .set("x-api-key", MCP_KEY)
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
    await waitForAuditLog();
    await mongoClient.close();
    await mongoServer.stop();
  });

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
        resources: [
          { id: "VF-12", type: "machine", state: "Busy", spindle: 1500 },
        ],
      });

    expect(submitResponse.status).toBe(200);

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

  it("should allow the Visual Components client to submit machine data", async () => {
    const response = await request(app)
      .post("/api/machine-data")
      .set("x-api-key", VC_KEY)
      .send({
        resources: [
          {
            id: "TEST-MACHINE",
            type: "machine",
            state: "Running",
            spindle: 1500,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Machine data received successfully");

    const storedEvents = await database
      .collection("machine_events")
      .find({ machineId: "TEST-MACHINE" })
      .toArray();

    expect(storedEvents.length).toBe(1);
    expect(storedEvents[0].values).toEqual({
      state: "Running",
      spindle: 1500,
    });
  });

  it("should deny a viewer access to machine data ingestion", async () => {
    const response = await request(app)
      .post("/api/machine-data")
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        resources: [{ id: "TEST-MACHINE", type: "machine", state: "Running" }],
      });

    expect(response.status).toBe(403);
  });

  it("should deny human users (even admin) from submitting machine data", async () => {
    const response = await request(app)
      .post("/api/machine-data")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        resources: [
          { id: "ADMIN-TEST-MACHINE", type: "machine", state: "Idle" },
        ],
      });

    expect(response.status).toBe(403);
  });

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

  it("should deny a viewer (JWT user)  to access the MCP endpoint", async () => {
    const response = await request(app)
      .post("/mcp")
      .set("Authorization", `Bearer ${viewerToken}`)
      .set("Accept", "application/json, text/event-stream")
      .send(initializeBody);

    expect(response.status).toBe(403);
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
    await initializeMcp();

    const response = await request(app)
      .post("/mcp")
      .set("x-api-key", MCP_KEY)
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
    expect(response.text).toContain("get_production_status");
  });

  it("should execute get_machine_property through MCP", async () => {
    await database.collection("machine_events").insertOne({
      source: "Integration Test",
      machineId: "TEST-MCP-MACHINE",
      timestamp: new Date(),
      values: { state: "Running", spindle: 1500 },
    });

    await initializeMcp();

    const response = await request(app)
      .post("/mcp")
      .set("x-api-key", MCP_KEY)
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
        timestamp: new Date(),
        values: { state: "Running", spindle: 1500 },
      },
      {
        source: "Integration Test",
        machineId: "TEST-MCP-MACHINE",
        property: "spindle",
        value: 1500,
        timestamp: new Date(),
      },
    ]);

    await initializeMcp();

    const response = await request(app)
      .post("/mcp")
      .set("x-api-key", MCP_KEY)
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
        timeStamp: "2026-11-01T10:05:00Z",
        resources: [
          {
            id: "TEST-MCP-MACHINE",
            type: "machine",
            state: "Running",
            spindle: 1500,
          },
        ],
      });

    expect(submitResponse.status).toBe(200);

    await initializeMcp();

    const response = await request(app)
      .post("/mcp")
      .set("x-api-key", MCP_KEY)
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
        resources: [{ id: "AI-MACHINE", type: "machine", state: "Running" }],
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
    await initializeMcp();

    const response = await request(app)
      .post("/mcp")
      .set("x-api-key", MCP_KEY)
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
    await initializeMcp();

    await request(app)
      .post("/mcp")
      .set("x-api-key", MCP_KEY)
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
    expect(entry?.client).toBe("mcp-ai-client");
    expect(entry?.clientType).toBe("ai-client");
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

  it("should return the newest events of all machines with a limit", async () => {
    await database.collection("machine_events").insertMany([
      {
        source: "Integration Test",
        machineId: "MACHINE-A",
        timestamp: new Date("2026-11-01T10:00:00Z"),
        values: { state: "Idle" },
      },
      {
        source: "Integration Test",
        machineId: "MACHINE-B",
        timestamp: new Date("2026-11-01T10:01:00Z"),
        values: { state: "Busy" },
      },
      {
        source: "Integration Test",
        machineId: "MACHINE-A",
        timestamp: new Date("2026-11-01T10:02:00Z"),
        values: { state: "Blocked" },
      },
    ]);

    const response = await request(app)
      .get("/api/events?limit=2")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);

    expect(response.body[0].values.state).toBe("Blocked");
    expect(response.body[1].machineId).toBe("MACHINE-B");
  });

  it("should use a default limit of 20 on /api/events", async () => {
    const events = Array.from({ length: 25 }, (_, i) => ({
      source: "Integration Test",
      machineId: "MACHINE-A",
      timestamp: new Date(Date.UTC(2026, 10, 1, 10, i)),
      values: { state: "Busy", partsExited: i },
    }));
    await database.collection("machine_events").insertMany(events);

    const response = await request(app)
      .get("/api/events")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(20);
  });

  it("should reject an invalid limit on /api/events", async () => {
    const tooBig = await request(app)
      .get("/api/events?limit=500")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(tooBig.status).toBe(400);

    const notANumber = await request(app)
      .get("/api/events?limit=abc")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(notANumber.status).toBe(400);
  });

  it("should reject the Visual Components key on /api/events", async () => {
    const response = await request(app)
      .get("/api/events")
      .set("x-api-key", VC_KEY);

    expect(response.status).toBe(403);
  });
});
