export interface CreateCheckoutDto {
  planId: string
  interval: "monthly" | "annual"
  returnTo?: "projects" | "settings"
}

export interface SubscriptionResponse {
  status: string
  tier: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  dodoCustomerId: string | null
}
