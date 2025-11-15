import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./newRoutes.js";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
// Exclude Stripe webhook path from JSON parsing to preserve raw body for signature verification
app.use((req, res, next) => {
  if (req.path === '/api/webhooks/stripe') {
    return next();
  }
  express.json({ limit: '50mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (req.path === '/api/webhooks/stripe') {
    return next();
  }
  express.urlencoded({ extended: false, limit: '50mb' })(req, res, next);
});

// Redirect qr.forescore.xyz subdomain to main registration page
app.use((req, res, next) => {
  const hostname = req.hostname || req.get('host')?.split(':')[0];
  if (hostname === 'qr.forescore.xyz') {
    return res.redirect(301, 'https://forescore.xyz/register');
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Add cache control headers for all responses
  app.use((req, res, next) => {
    // HTML files and API endpoints: no cache
    if (req.path.endsWith('.html') || req.path === '/' || req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // JS/CSS with hash (Vite uses format like app-abc123XY.js): long-term cache
    else if (/\-[0-9a-zA-Z]{8,}\.(js|css)$/i.test(req.path)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Other static assets: moderate cache
    else if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    }
    next();
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 80 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '80', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
