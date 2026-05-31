import { prisma, PlanTier } from "../src/index.js"

async function main() {
  const plans = [
    {
      tier: PlanTier.FREE,
      eventsPerMonth: 10_000,
      retentionDays: 1,    // 24h
      endpointLimit: 1,    // 1 workspace
      priceCents: 0,
    },
    {
      tier: PlanTier.STARTER,
      eventsPerMonth: 100_000,
      retentionDays: 7,
      endpointLimit: 3,    // 3 workspaces
      priceCents: 1200,    // $12/mo
    },
    {
      tier: PlanTier.PRO,
      eventsPerMonth: 1_000_000,
      retentionDays: 30,
      endpointLimit: 999,  // unlimited workspaces
      priceCents: 3500,    // $35/mo
    },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      create: plan,
      update: {
        eventsPerMonth: plan.eventsPerMonth,
        retentionDays: plan.retentionDays,
        endpointLimit: plan.endpointLimit,
        priceCents: plan.priceCents,
      },
    })
  }

  console.log("✓ Plans seeded (FREE / STARTER / PRO)")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
