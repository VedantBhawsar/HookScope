/** Common test fixtures shared across all test files. */

export const fakeUser = {
  id: "user-001",
  name: "Test User",
  email: "test@example.com",
  avatarUrl: null as string | null,
  onboarding: {
    emailVerified: false,
    companyName: null as string | null,
    companySize: null as string | null,
    companyRole: null as string | null,
    useCase: null as string | null,
    onboardingCompleted: false,
    hasCreatedProject: false,
    isNewUser: true,
  },
}

export const fakeTokens = {
  accessToken: "fake-access-token-string",
  expiresIn: 900,
}

export const fakeAuthResponse = {
  user: fakeUser,
  tokens: fakeTokens,
  refreshToken: "raw-refresh-token-hex",
  subscription: null,
}

export const fakeProject = {
  id: "proj-001",
  name: "Test Project",
  userId: "user-001",
  description: null as string | null,
  deletedAt: null as Date | null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
}

export const fakePaginatedProjects = {
  data: [fakeProject],
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
}

export const fakeEndpoint = {
  id: "ep-001",
  projectId: "proj-001",
  name: "Test Endpoint",
  source: "GITHUB",
  destinationUrl: "https://example.com/webhook",
  verificationMode: "NONE",
  signingSecret: null as string | null,
  status: "active",
  toleranceSec: null as number | null,
  tokenHash: "abc123",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  deletedAt: null as Date | null,
}

export const fakePaginatedEndpoints = {
  data: [fakeEndpoint],
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
}

export const fakeWebhookEvent = {
  id: "evt-001",
  endpointId: "ep-001",
  eventId: "github-evt-abc",
  eventType: "push",
  status: "DELIVERED",
  source: "GITHUB",
  payloadUrl: "s3://webhooks/events/github/2026-01-01/evt-001.json",
  receivedAt: new Date("2026-01-01T00:00:00Z"),
  createdAt: new Date("2026-01-01T00:00:00Z"),
}

export const fakePaginatedEvents = {
  data: [fakeWebhookEvent],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
}

export const fakeDelivery = {
  id: "del-001",
  eventId: "evt-001",
  status: "SUCCESS",
  statusCode: 200,
  responseBody: '{"ok":true}',
  retryCount: 0,
  nextRetryAt: null as Date | null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
}

export const fakeAlert = {
  id: "alert-001",
  name: "High Failure Rate",
  type: "DELIVERY_FAILURE_RATE",
  severity: "WARNING",
  endpointId: null as string | null,
  config: { threshold: 10, windowMinutes: 5 },
  isActive: true,
  userId: "user-001",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
}

export const fakeAlertTrigger = {
  id: "trigger-001",
  alertId: "alert-001",
  message: "Delivery failure rate exceeded threshold",
  metadata: {},
  createdAt: new Date("2026-01-01T00:00:00Z"),
}

export const fakeSubscription = {
  status: "active",
  tier: "DEVELOPER",
  currentPeriodEnd: "2026-02-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  stripeCustomerId: "cus_test123",
}

export const fakeUsage = {
  currentMonth: "2026-01",
  eventCount: 42,
  plan: { tier: "FREE", eventsPerMonth: 10000, endpointLimit: 3, retentionDays: 7 },
  endpoints: { used: 1, limit: 3 },
}
