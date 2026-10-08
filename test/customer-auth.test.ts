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
import Product from "../backend/models/product.model";
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


// Product tests use the same isolated MongoDB and real HTTP server as auth tests.
const keyboard = {
  name: "Mechanical Keyboard", description: "A comfortable mechanical keyboard.",
  price: 2999, category: "Electronics", image: "/images/keyboard.svg", stock: 10,
};
let keyboardId = "";

test("product schema independently enforces mandatory fields, positive price and whole nonnegative stock", async () => {
  for (const field of ["name", "description", "price", "category", "image", "stock"]) {
    const data: Record<string, unknown> = { ...keyboard };
    delete data[field];
    await assert.rejects(new Product(data).validate(), mongoose.Error.ValidationError);
  }
  for (const price of [0, -1, Infinity]) {
    await assert.rejects(new Product({ ...keyboard, price }).validate(), mongoose.Error.ValidationError);
  }
  for (const stock of [-1, 1.5]) {
    await assert.rejects(new Product({ ...keyboard, stock }).validate(), mongoose.Error.ValidationError);
  }
  await new Product({ ...keyboard, stock: 0 }).validate();
});

test("creates products publicly, persists them and generates IDs and timestamps", async () => {
  authCookie = null;
  const empty = await request("/products");
  assert.equal(empty.response.status, 200);
  assert.equal(empty.body.count, 0);
  const created = await request("/products", {
    method: "POST", body: JSON.stringify({ ...keyboard, _id: "aaaaaaaaaaaaaaaaaaaaaaaa", createdAt: "2000-01-01" }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.success, true);
  keyboardId = created.body.product._id;
  assert.notEqual(keyboardId, "aaaaaaaaaaaaaaaaaaaaaaaa");
  assert.ok(Date.parse(created.body.product.createdAt) > Date.parse("2020-01-01"));
  const stored = await Product.findById(keyboardId);
  assert.equal(stored?.name, keyboard.name);
  assert.equal(stored?.stock, 10);

  for (const product of [
    { ...keyboard, name: "Keyboard (Mini)", price: 999, stock: 0 },
    { ...keyboard, name: "Cotton Shirt", category: "Fashion", price: 699 },
    { ...keyboard, name: "Keyboard Handbook", category: "Books", price: 399 },
  ]) {
    assert.equal((await request("/products", { method: "POST", body: JSON.stringify(product) })).response.status, 201);
  }
});

test("rejects missing, malformed and invalid product fields with 400", async () => {
  for (const field of ["name", "description", "price", "category", "image", "stock"]) {
    const data: Record<string, unknown> = { ...keyboard };
    delete data[field];
    assert.equal((await request("/products", { method: "POST", body: JSON.stringify(data) })).response.status, 400, field);
  }
  for (const override of [
    { name: "   " }, { category: {} }, { image: [] }, { description: null },
    { price: 0 }, { price: -10 }, { price: "2999" }, { price: null },
    { stock: -1 }, { stock: 1.5 }, { stock: "10" }, { stock: true },
  ]) {
    assert.equal((await request("/products", { method: "POST", body: JSON.stringify({ ...keyboard, ...override }) })).response.status, 400);
  }
  assert.equal((await Product.countDocuments()), 4);
});

test("lists summaries, searches names case-insensitively, combines category and sorts prices", async () => {
  const all = await request("/products");
  assert.equal(all.body.count, 4);
  assert.equal(all.body.products.length, 4);
  assert.equal("description" in all.body.products[0], false);
  assert.equal("createdAt" in all.body.products[0], false);
  assert.equal((await request("/products?search=KEYBOARD")).body.count, 3);
  assert.equal((await request("/products?category=Electronics")).body.count, 2);
  const combined = await request("/products?search=keyboard&category=Electronics&sort=price_asc");
  assert.deepEqual(combined.body.products.map((product: { price: number }) => product.price), [999, 2999]);
  const descending = await request("/products?sort=price_desc");
  assert.deepEqual(descending.body.products.map((product: { price: number }) => product.price), [2999, 999, 699, 399]);
  assert.equal((await request("/products?search=description-only-text")).body.count, 0);
  assert.equal((await request("/products?search=keyboard&category=Home")).body.count, 0);
  assert.equal((await request("/products?search=%28Mini%29")).body.count, 1);
  assert.equal((await request("/products?search=.*")).body.count, 0);
  assert.equal((await request("/products?search=%20KEYBOARD%20")).body.count, 3);
  assert.equal((await request("/api/products?category=Books")).body.count, 1);
  for (const query of ["sort=wrong", "search=one&search=two", "category[$ne]=Books"]) {
    assert.equal((await request(`/products?${query}`)).response.status, 400);
  }
});

test("fetches complete product details and distinguishes invalid IDs from missing products", async () => {
  const details = await request(`/products/${keyboardId}`);
  assert.equal(details.response.status, 200);
  assert.equal(details.body.product.description, keyboard.description);
  assert.equal(details.body.product.price, keyboard.price);
  assert.equal((await request(`/api/products/${keyboardId}`)).body.product._id, keyboardId);
  assert.equal((await request("/products/not-an-id")).response.status, 400);
  assert.equal((await request("/products/aaaaaaaaaaaaaaaaaaaaaaaa")).response.status, 404);
});
