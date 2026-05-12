import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// Use WebSocket for local dev, HTTP fetch for Vercel edge/serverless
if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ws = require("ws");
  neonConfig.webSocketConstructor = ws;
}

const connectionString = process.env.DATABASE_URL!;

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
