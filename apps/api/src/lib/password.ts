import Bun from 'bun'


/** Argon2id via Bun.password (built-in, zero external deps). */
export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return Bun.password.verify(plain, hash)
}