import type { Response } from "express"

export const json = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json(data)
}

export const error = (res: Response, message: string, status = 500): void => {
  res.status(status).json({ error: message })
}

export const notFound = (res: Response, message = "Not found"): void => {
  error(res, message, 404)
}

export const badRequest = (res: Response, message = "Bad request"): void => {
  error(res, message, 400)
}

export const created = (res: Response, data: unknown): void => {
  json(res, data, 201)
}

export const noContent = (res: Response): void => {
  res.status(204).send()
}

export const unauthorized = (res: Response, message = "Unauthorized"): void => {
  error(res, message, 401)
}

export const conflict = (res: Response, message = "Conflict"): void => {
  error(res, message, 409)
}
