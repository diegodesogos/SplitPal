import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


// Initialize Passport and restore authentication state from session
import passport from 'passport';
import { configurePassport } from './auth.js';

app.use(passport.initialize());
configurePassport(passport);

// Simple logging middleware for development
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      // Log only API routes to keep the console clean
      if (req.path.startsWith("/api")) {
        console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      }
    });
    next();
  });
}

// --- API Routes ---
// All your routes from ./routes.js will be prefixed with /api
registerRoutes(app);

// --- Error Handling ---
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server error:", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// --- Local Development Server ---
// This block is crucial. It only runs when you start the server locally.
// Vercel sets the VERCEL environment variable to "1", so this block is ignored during deployment.
if (process.env.VERCEL !== "1") {
  const BACKEND_PORT = Number(process.env.BACKEND_PORT || 5001);
  
  // For local dev, we need Express to serve the static front-end files
  const clientPath = path.resolve(__dirname, "../client");
  app.use(express.static(clientPath));
  
  // Local catch-all: if a route is not an API route, serve the front-end app
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(clientPath, "index.html"));
  });

  app.listen(BACKEND_PORT, () => {
    console.log(`🚀 Server is running locally at http://localhost:${BACKEND_PORT}`);
  });
}

// --- Vercel Export ---
// This is the single export Vercel needs to wrap your Express app in a serverless function.
export default app;
