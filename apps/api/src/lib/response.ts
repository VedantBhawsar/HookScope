export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export function error(message: string, status = 500): Response {
  return json({ error: message }, status)
}

export function notFound(message = "Not found"): Response {
  return error(message, 404)
}

export function badRequest(message = "Bad request"): Response {
  return error(message, 400)
}

export function created(data: unknown): Response {
  return json(data, 201)
}

export function noContent(): Response {
  return new Response(null, { status: 204 })
}
