export interface Webhook {
  id: string
  url: string
  secret: string | null
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateWebhookDto {
  url: string
  secret?: string
  description?: string
}

export interface UpdateWebhookDto {
  url?: string
  secret?: string | null
  description?: string | null
  isActive?: boolean
}

export interface WebhookListResult {
  data: Webhook[]
  total: number
}
