export interface RegisterDto {
  name: string
  email: string
  password: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  expiresIn: number // seconds until access token expires
}

export interface AuthOnboardingState {
  emailVerified: boolean
  companyName: string | null
  companySize: string | null
  companyRole: string | null
  useCase: string | null
  onboardingCompleted: boolean
  hasCreatedProject: boolean
  isNewUser: boolean
}

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  onboarding: AuthOnboardingState
}

export interface AuthResponse {
  user: AuthUser
  tokens: AuthTokens
}

export interface AccessTokenPayload {
  userId: string
  email: string
}

export interface CompleteOnboardingDto {
  companyName: string
  companySize?: string
  companyRole?: string
  useCase?: string
}
