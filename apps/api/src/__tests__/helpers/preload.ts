/**
 * Bun test preload — runs before every test file.
 * Sets up module-level mocks for all services, repositories, and external libs
 * so tests never touch a real database, Redis, S3, or external APIs.
 */
import { mock } from "bun:test"

// ── Environment ──────────────────────────────────────────────────────────────
process.env["JWT_ACCESS_SECRET"] = "test-jwt-secret-32-chars-minimum!!"
process.env["MAINTENANCE_SECRET"] = "test-maintenance-secret"
process.env["NODE_ENV"] = "test"
process.env["FRONTEND_URL"] = "http://localhost:3000"

// ── Shared mock functions ────────────────────────────────────────────────────
// Each test file imports `mocks`, sets desired return values, and resets in beforeEach.

export const mocks = {
  auth: {
    register: mock<(...a: any[]) => any>(),
    login: mock<(...a: any[]) => any>(),
    refresh: mock<(...a: any[]) => any>(),
    logout: mock<(...a: any[]) => any>(),
    logoutAllDevices: mock<(...a: any[]) => any>(),
    getSessionUser: mock<(...a: any[]) => any>(),
    completeOnboarding: mock<(...a: any[]) => any>(),
    updateProfile: mock<(...a: any[]) => any>(),
    uploadAvatar: mock<(...a: any[]) => any>(),
    sendVerificationOtp: mock<(...a: any[]) => any>(),
    verifyEmailOtp: mock<(...a: any[]) => any>(),
    forgotPassword: mock<(...a: any[]) => any>(),
    resetPassword: mock<(...a: any[]) => any>(),
    oauthSignin: mock<(...a: any[]) => any>(),
    getLinkedAccounts: mock<(...a: any[]) => any>(),
    unlinkSocialAccount: mock<(...a: any[]) => any>(),
    linkSocialAccountToUser: mock<(...a: any[]) => any>(),
  },
  project: {
    listByUser: mock<(...a: any[]) => any>(),
    getById: mock<(...a: any[]) => any>(),
    create: mock<(...a: any[]) => any>(),
    update: mock<(...a: any[]) => any>(),
    softDelete: mock<(...a: any[]) => any>(),
  },
  endpoint: {
    verifyOwnership: mock<(...a: any[]) => any>(),
    listByProject: mock<(...a: any[]) => any>(),
    getById: mock<(...a: any[]) => any>(),
    create: mock<(...a: any[]) => any>(),
    update: mock<(...a: any[]) => any>(),
    toggleStatus: mock<(...a: any[]) => any>(),
    softDelete: mock<(...a: any[]) => any>(),
    getStats: mock<(...a: any[]) => any>(),
    getVolume: mock<(...a: any[]) => any>(),
    getDeliveryStats: mock<(...a: any[]) => any>(),
    getDeliveries: mock<(...a: any[]) => any>(),
  },
  webhook: {
    listByUser: mock<(...a: any[]) => any>(),
    getById: mock<(...a: any[]) => any>(),
    listDeliveries: mock<(...a: any[]) => any>(),
    listLogs: mock<(...a: any[]) => any>(),
    retry: mock<(...a: any[]) => any>(),
    batchReplay: mock<(...a: any[]) => any>(),
    batchDelete: mock<(...a: any[]) => any>(),
  },
  alert: {
    list: mock<(...a: any[]) => any>(),
    create: mock<(...a: any[]) => any>(),
    getById: mock<(...a: any[]) => any>(),
    update: mock<(...a: any[]) => any>(),
    delete: mock<(...a: any[]) => any>(),
    listTriggers: mock<(...a: any[]) => any>(),
    createTestTrigger: mock<(...a: any[]) => any>(),
    listAllTriggers: mock<(...a: any[]) => any>(),
  },
  billing: {
    createCheckoutSession: mock<(...a: any[]) => any>(),
    createPortalSession: mock<(...a: any[]) => any>(),
    getSubscription: mock<(...a: any[]) => any>(),
    changePlan: mock<(...a: any[]) => any>(),
    handleWebhookEvent: mock<(...a: any[]) => any>(),
  },
  usage: {
    getCurrentMonthUsage: mock<(...a: any[]) => any>(),
    getPlanForUser: mock<(...a: any[]) => any>(),
    getActiveEndpointCount: mock<(...a: any[]) => any>(),
  },
  maintenance: {
    expireOldEvents: mock<(...a: any[]) => any>(),
    cleanupDeletedEventLogs: mock<(...a: any[]) => any>(),
  },
  oauth: {
    getGoogleAuthUrl: mock<(...a: any[]) => string>(),
    getGitHubAuthUrl: mock<(...a: any[]) => string>(),
    exchangeGoogleCode: mock<(...a: any[]) => any>(),
    exchangeGitHubCode: mock<(...a: any[]) => any>(),
  },
  sse: {
    add: mock<(...a: any[]) => any>(),
    remove: mock<(...a: any[]) => any>(),
    send: mock<(...a: any[]) => any>(),
  },
}

// ── Service mocks ────────────────────────────────────────────────────────────

mock.module("../../services/auth.service", () => ({
  AuthService: class {
    register = (...a: any[]) => mocks.auth.register(...a)
    login = (...a: any[]) => mocks.auth.login(...a)
    refresh = (...a: any[]) => mocks.auth.refresh(...a)
    logout = (...a: any[]) => mocks.auth.logout(...a)
    logoutAllDevices = (...a: any[]) => mocks.auth.logoutAllDevices(...a)
    getSessionUser = (...a: any[]) => mocks.auth.getSessionUser(...a)
    completeOnboarding = (...a: any[]) => mocks.auth.completeOnboarding(...a)
    updateProfile = (...a: any[]) => mocks.auth.updateProfile(...a)
    uploadAvatar = (...a: any[]) => mocks.auth.uploadAvatar(...a)
    sendVerificationOtp = (...a: any[]) => mocks.auth.sendVerificationOtp(...a)
    verifyEmailOtp = (...a: any[]) => mocks.auth.verifyEmailOtp(...a)
    forgotPassword = (...a: any[]) => mocks.auth.forgotPassword(...a)
    resetPassword = (...a: any[]) => mocks.auth.resetPassword(...a)
    oauthSignin = (...a: any[]) => mocks.auth.oauthSignin(...a)
    getLinkedAccounts = (...a: any[]) => mocks.auth.getLinkedAccounts(...a)
    unlinkSocialAccount = (...a: any[]) => mocks.auth.unlinkSocialAccount(...a)
    linkSocialAccountToUser = (...a: any[]) => mocks.auth.linkSocialAccountToUser(...a)
  },
}))

mock.module("../../services/project.service", () => ({
  ProjectService: class {
    listByUser = (...a: any[]) => mocks.project.listByUser(...a)
    getById = (...a: any[]) => mocks.project.getById(...a)
    create = (...a: any[]) => mocks.project.create(...a)
    update = (...a: any[]) => mocks.project.update(...a)
    softDelete = (...a: any[]) => mocks.project.softDelete(...a)
  },
}))

mock.module("../../services/endpoint.service", () => ({
  EndpointService: class {
    verifyOwnership = (...a: any[]) => mocks.endpoint.verifyOwnership(...a)
    listByProject = (...a: any[]) => mocks.endpoint.listByProject(...a)
    getById = (...a: any[]) => mocks.endpoint.getById(...a)
    create = (...a: any[]) => mocks.endpoint.create(...a)
    update = (...a: any[]) => mocks.endpoint.update(...a)
    toggleStatus = (...a: any[]) => mocks.endpoint.toggleStatus(...a)
    softDelete = (...a: any[]) => mocks.endpoint.softDelete(...a)
    getStats = (...a: any[]) => mocks.endpoint.getStats(...a)
    getVolume = (...a: any[]) => mocks.endpoint.getVolume(...a)
    getDeliveryStats = (...a: any[]) => mocks.endpoint.getDeliveryStats(...a)
    getDeliveries = (...a: any[]) => mocks.endpoint.getDeliveries(...a)
  },
}))

mock.module("../../services/webhook.service", () => ({
  WebhookService: class {
    listByUser = (...a: any[]) => mocks.webhook.listByUser(...a)
    getById = (...a: any[]) => mocks.webhook.getById(...a)
    listDeliveries = (...a: any[]) => mocks.webhook.listDeliveries(...a)
    listLogs = (...a: any[]) => mocks.webhook.listLogs(...a)
    retry = (...a: any[]) => mocks.webhook.retry(...a)
    batchReplay = (...a: any[]) => mocks.webhook.batchReplay(...a)
    batchDelete = (...a: any[]) => mocks.webhook.batchDelete(...a)
  },
}))

mock.module("../../alerts/alert.service", () => ({
  AlertService: class {
    list = (...a: any[]) => mocks.alert.list(...a)
    create = (...a: any[]) => mocks.alert.create(...a)
    getById = (...a: any[]) => mocks.alert.getById(...a)
    update = (...a: any[]) => mocks.alert.update(...a)
    delete = (...a: any[]) => mocks.alert.delete(...a)
    listTriggers = (...a: any[]) => mocks.alert.listTriggers(...a)
    createTestTrigger = (...a: any[]) => mocks.alert.createTestTrigger(...a)
    listAllTriggers = (...a: any[]) => mocks.alert.listAllTriggers(...a)
  },
}))

mock.module("../../billing/billing.service", () => ({
  BillingService: class {
    createCheckoutSession = (...a: any[]) => mocks.billing.createCheckoutSession(...a)
    createPortalSession = (...a: any[]) => mocks.billing.createPortalSession(...a)
    getSubscription = (...a: any[]) => mocks.billing.getSubscription(...a)
    changePlan = (...a: any[]) => mocks.billing.changePlan(...a)
    handleWebhookEvent = (...a: any[]) => mocks.billing.handleWebhookEvent(...a)
  },
}))

mock.module("../../services/event-expiration.service", () => ({
  EventExpirationService: class {
    expireOldEvents = (...a: any[]) => mocks.maintenance.expireOldEvents(...a)
    cleanupDeletedEventLogs = (...a: any[]) => mocks.maintenance.cleanupDeletedEventLogs(...a)
  },
}))

// ── Repository mocks (prevent DB instantiation side-effects) ─────────────────

mock.module("../../usage/usage.repository", () => ({
  UsageRepository: class {
    getCurrentMonthUsage = (...a: any[]) => mocks.usage.getCurrentMonthUsage(...a)
    getPlanForUser = (...a: any[]) => mocks.usage.getPlanForUser(...a)
    getActiveEndpointCount = (...a: any[]) => mocks.usage.getActiveEndpointCount(...a)
  },
}))

mock.module("../../repositories/auth.repository", () => ({ AuthRepository: class {} }))
mock.module("../../repositories/project.repository", () => ({ ProjectRepository: class {} }))
mock.module("../../repositories/endpoint.repository", () => ({ EndpointRepository: class {} }))
mock.module("../../repositories/webhook.repository", () => ({ WebhookRepository: class {} }))
mock.module("../../alerts/alert.repository", () => ({ AlertRepository: class {} }))
mock.module("../../billing/billing.repository", () => ({ BillingRepository: class {} }))

// ── External / infrastructure mocks ─────────────────────────────────────────

mock.module("../../lib/oauth", () => ({
  getGoogleAuthUrl: (...a: any[]) => mocks.oauth.getGoogleAuthUrl(...a),
  getGitHubAuthUrl: (...a: any[]) => mocks.oauth.getGitHubAuthUrl(...a),
  exchangeGoogleCode: (...a: any[]) => mocks.oauth.exchangeGoogleCode(...a),
  exchangeGitHubCode: (...a: any[]) => mocks.oauth.exchangeGitHubCode(...a),
}))

mock.module("../../lib/sse-manager", () => ({
  sseManager: {
    add: (...a: any[]) => mocks.sse.add(...a),
    remove: (...a: any[]) => mocks.sse.remove(...a),
    send: (...a: any[]) => mocks.sse.send(...a),
  },
}))

mock.module("../../lib/rate-limit", () => {
  const pass = (_req: any, _res: any, next: () => void) => next()
  return {
    forgotPasswordRateLimit: pass,
    oauthCallbackRateLimit: pass,
    otpSendRateLimit: pass,
  }
})

mock.module("../../lib/alert-evaluator", () => ({ initAlertEvaluator: () => {} }))
mock.module("../../services/event-cron.service", () => ({ startEventExpirationCron: () => {} }))
mock.module("../../lib/email", () => ({
  sendPasswordResetEmail: mock(),
  sendEmailVerificationOtp: mock(),
}))

// Prevent Prisma from attempting a DB connection during module load
const deepProxy = (): any =>
  new Proxy(
    (() => Promise.resolve(null)) as any,
    {
      get: () => deepProxy(),
      apply: () => Promise.resolve(null),
    },
  )

mock.module("@hookscope/db/client", () => ({ prisma: deepProxy() }))
mock.module("@hookscope/redis", () => ({ redis: deepProxy(), getRedisClient: () => deepProxy() }))
mock.module("@hookscope/s3", () => ({
  putObject: mock(() => Promise.resolve()),
  deleteObject: mock(() => Promise.resolve()),
  getS3Client: mock(() => ({})),
}))
