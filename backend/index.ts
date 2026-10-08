import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import customerRoutes from "./routes/customer.routes";
import wishlistRoutes from "./routes/wishlist.routes";
import productRoutes from "./routes/product.routes";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch (error: unknown) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}

const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/shopkart";

export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/products", productRoutes);
  app.use("/api/wishlist", wishlistRoutes);

  // After build:all, Express can serve the React app and API on one origin.
  // The development client uses Vite's /customers proxy instead.
  const clientDist = path.resolve(__dirname, "../../client/dist");
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist));
    app.get(["/", "/login", "/register", "/home", "/products", "/products/:id", "/wishlist"], (req, res, next) => {
      // /products is both a lab API endpoint and a React page. Browser page
      // navigation asks for HTML; API clients receive JSON from productRoutes.
      if ((req.path.startsWith("/products") || req.path === "/wishlist") && !req.headers.accept?.includes("text/html")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.get("/", (req, res) => {
    res.status(200).json({
      success: true,
      message: "ShopKart customer authentication service is running",
    });
  });

  app.use("/customers", customerRoutes);
  app.use("/products", productRoutes);
  app.use("/wishlist", wishlistRoutes);

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "Route not found",
    });
  });

  const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (
      error instanceof SyntaxError &&
      "status" in error &&
      error.status === 400 &&
      "body" in error
    ) {
      return res.status(400).json({
        success: false,
        message: "Request body must be valid JSON",
      });
    }

    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  };

  app.use(errorHandler);

  return app;
}

export async function startServer(): Promise<ReturnType<express.Express["listen"]>> {
  await mongoose.connect(MONGODB_URI);
  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`ShopKart auth service listening on port ${PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`${signal} received; shutting down`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  return server;
}

if (require.main === module) {
  void startServer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Unable to start ShopKart auth service:", message);
    process.exitCode = 1;
  });
}
