export async function adminFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token =
    localStorage.getItem("_medusa_auth_token") ||
    localStorage.getItem("medusa_auth_token") ||
    ""
  const res = await fetch(`/admin${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  })
  /**
   * Surface the SERVER'S message, not just the status code.
   *
   * This used to throw a bare "Request failed: 500", which turned every backend problem — a
   * missing column, a validation refusal, a guard saying exactly why it said no — into the same
   * useless toast. The reason was always in the response body; nothing read it.
   */
  if (!res.ok) {
    let message = `Request failed: ${res.status}`
    try {
      const body = await res.json()
      const detail = body?.message || body?.error
      if (detail) message = typeof detail === "string" ? detail : JSON.stringify(detail)
    } catch {
      /* non-JSON body — the status is all we have */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}
