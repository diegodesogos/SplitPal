import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import path from "path";
import { fileURLToPath } from "url";
import serverless from "serverless-http";

const BACKEND_PORT = Number(process.env.BACKEND_PORT || process.env.SERVER_PORT || 5001);
const VITE_PORT = Number(process.env.VITE_PORT || process.env.PORT || 3001);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple logging middleware (only for development)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (req.path.startsWith("/api")) {
        console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      }
    });
    next();
  });
}

// Register API routes
registerRoutes(app);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server error:", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const clientPath = path.resolve(__dirname, "../client");
  app.use(express.static(clientPath));
  
  // Catch-all handler: send back React's index.html file for client-side routing
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(clientPath, "index.html"));
  });
}

// Only start server if not in Vercel (Vercel handles this automatically)
if (process.env.VERCEL !== "1") {
  const port = parseInt(process.env.PORT || BACKEND_PORT.toString(), 10);
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

// --- EXPORT FOR VERCEL ---
export const handler = serverless(app);
