import type { Response } from "express"

type ApiResponse<T> = {
  success: boolean
  message: string
  data: T | null
}

export const json = (res: Response, data: unknown, status = 200, message = "Success"): void => {
  const payload: ApiResponse<unknown> = {
    success: true,
    message,
    data,
  }
  res.status(status).json(payload)
}

export const error = (res: Response, message: string, status = 500): void => {
  const payload: ApiResponse<null> = {
    success: false,
    message,
    data: null,
  }
  res.status(status).json(payload)
}

export const notFound = (res: Response, message = "Not found"): void => {
  error(res, message, 404)
}

export const badRequest = (res: Response, message = "Bad request"): void => {
  error(res, message, 400)
}

export const created = (res: Response, data: unknown, message = "Created"): void => {
  json(res, data, 201, message)
}

export const noContent = (res: Response, message = "Success"): void => {
  json(res, null, 200, message)
}

export const unauthorized = (res: Response, message = "Unauthorized"): void => {
  error(res, message, 401)
}

export const conflict = (res: Response, message = "Conflict"): void => {
  error(res, message, 409)
}
