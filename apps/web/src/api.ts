import type { DemoMessageAck, DemoSendInput, ProjectState, VersionInfo } from '@telewa/contracts'

type Success<T> = { success: true; data: T; meta: { requestId: string } }
type Failure = {
  success: false
  error: { code: string; message: string; retryable: boolean }
  meta: { requestId: string }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  const body = (await response.json()) as Success<T> | Failure
  if (!response.ok || !body.success) {
    throw new Error(body.success ? `Request failed (${response.status})` : body.error.message)
  }
  return body.data
}

export const api = {
  version: () => request<VersionInfo>('/api/version'),
  projectState: () => request<ProjectState>('/api/project-state'),
  sendDemoMessage: (input: DemoSendInput) =>
    request<DemoMessageAck>('/api/demo/messages', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
}
