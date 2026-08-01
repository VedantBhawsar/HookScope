import { PrismaClient } from "../generated/client/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { loadDbEnv } from "@hookscope/env"

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

const env = loadDbEnv()

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export type { Prisma } from "../generated/client/client.js"
