import { prisma, PlanTier } from "../src/index.js"

async function main() {
  const plans = [
    {
      tier: PlanTier.DEVELOPER,
      eventsPerMonth: 250_000,
      retentionDays: 14,
      endpointLimit: 10,
      priceCents: 1000,
    },
    {
      tier: PlanTier.PRO,
      eventsPerMonth: 2_000_000,
      retentionDays: 30,
      endpointLimit: 50,
      priceCents: 3900,
    },
    {
      tier: PlanTier.ENTERPRISE,
      eventsPerMonth: 10_000_000,
      retentionDays: 90,
      endpointLimit: 999,
      priceCents: 9900,
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

  console.log("✓ Plans seeded")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
