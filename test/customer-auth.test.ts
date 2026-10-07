import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { after, before, test } from "node:test";
import type { Server } from "node:http";

import mongoose from "mongoose";
import Customer from "../backend/models/customer.model";
import { createApp } from "../backend/index";

let mongod: ChildProcessWithoutNullStreams | undefined;
let mongoDataPath: string | undefined;
let server: Server | undefined;
let baseUrl = "";
let authCookie: string | null = null;

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        probe.close();
        reject(new Error("Could not determine a free port"));
        return;
      }

      probe.close(() => resolve(address.port));
    });
  });
}

function waitForMongo(processHandle: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error(`mongod did not start in time. Output: ${output}`));
    }, 30000);

    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes("Waiting for connections")) {
        clearTimeout(timeout);
        resolve();
      }
    };

    processHandle.stdout.on("data", onData);
    processHandle.stderr.on("data", onData);
    processHandle.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    processHandle.once("exit", (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`mongod exited before startup with code ${code}. Output: ${output}`));
      }
    });
  });
}

function getSetCookie(response: Response): string {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  return headers.getSetCookie?.()[0] || response.headers.get("set-cookie") || "";
}

function cookieValue(setCookieHeader: string): string {
  return setCookieHeader.split(";", 1)[0];
}

async function request(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (authCookie) {
    headers.set("cookie", authCookie);
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });
  const body = await response.json() as Record<string, any>;
  return { response, body };
}

before(async () => {
  const mongodPort = await getFreePort();
  mongoDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "shopkart-auth-test-"));
  mongod = spawn(process.env.MONGOD_BIN || "mongod", [
    "--dbpath",
    mongoDataPath,
    "--port",
    String(mongodPort),
    "--bind_ip",
    "127.0.0.1",
    "--quiet",
  ]);
  await waitForMongo(mongod);

  await mongoose.connect(`mongodb://127.0.0.1:${mongodPort}/shopkart_test`);
  await Customer.deleteMany({});

  server = createApp().listen(0);
  await new Promise<void>((resolve) => server!.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not determine the test server port");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  }
  await mongoose.disconnect();
  if (mongod && mongod.exitCode === null) {
    mongod.kill("SIGINT");
    await new Promise<void>((resolve) => mongod!.once("exit", () => resolve()));
  }
  if (mongoDataPath) {
    fs.rmSync(mongoDataPath, { recursive: true, force: true });
  }
});

test("registers a customer without returning or storing a plaintext password", async () => {
  const { response, body } = await request("/customers/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "John Doe",
      email: "John@Gmail.com",
      password: "john123",
      phone: "9876543210",
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.customer.email, "john@gmail.com");
  assert.equal("password" in body.customer, false);

  const stored = await Customer.findOne({ email: "john@gmail.com" }).select("+password");
  assert.ok(stored);
  assert.notEqual(stored.password, "john123");
  assert.match(stored.password, /^\$2[aby]\$/);
});

test("rejects duplicate email, missing fields, and short passwords", async () => {
  const duplicate = await request("/customers/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "Another Customer",
      email: "john@gmail.com",
      password: "another123",
      phone: "1234567890",
    }),
  });
  assert.equal(duplicate.response.status, 409);

  const missing = await request("/customers/register", {
    method: "POST",
    body: JSON.stringify({ fullName: "Missing Fields" }),
  });
  assert.equal(missing.response.status, 400);

  const shortPassword = await request("/customers/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "Short Password",
      email: "short@example.com",
      password: "12345",
      phone: "1234567890",
    }),
  });
  assert.equal(shortPassword.response.status, 400);
});

test("logs in with a generic failure and an HttpOnly JWT cookie on success", async () => {
  const wrongPassword = await request("/customers/login", {
    method: "POST",
    body: JSON.stringify({ email: "john@gmail.com", password: "wrong123" }),
  });
  assert.equal(wrongPassword.response.status, 401);
  assert.equal(wrongPassword.body.message, "Invalid email or password");

  const login = await request("/customers/login", {
    method: "POST",
    body: JSON.stringify({ email: "john@gmail.com", password: "john123" }),
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.body.success, true);
  assert.equal("password" in login.body.customer, false);

  const setCookie = getSetCookie(login.response);
  assert.match(setCookie, /^shopkart_auth=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  authCookie = cookieValue(setCookie);
});

test("protects the profile, changes the password, and logs out", async () => {
  const profile = await request("/customers/me");
  assert.equal(profile.response.status, 200);
  assert.equal(profile.body.email, "john@gmail.com");
  assert.equal("password" in profile.body, false);

  const passwordChange = await request("/customers/change-password", {
    method: "PATCH",
    body: JSON.stringify({ oldPassword: "john123", newPassword: "newjohn123" }),
  });
  assert.equal(passwordChange.response.status, 200);

  const logout = await request("/customers/logout", { method: "POST" });
  assert.equal(logout.response.status, 200);
  assert.match(getSetCookie(logout.response), /shopkart_auth=;/);

  authCookie = null;
  const unauthorized = await request("/customers/me");
  assert.equal(unauthorized.response.status, 401);

  authCookie = "shopkart_auth=not-a-valid-jwt";
  const invalidToken = await request("/customers/me");
  assert.equal(invalidToken.response.status, 401);

  authCookie = null;
  const newLogin = await request("/customers/login", {
    method: "POST",
    body: JSON.stringify({ email: "john@gmail.com", password: "newjohn123" }),
  });
  assert.equal(newLogin.response.status, 200);
});
