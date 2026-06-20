import type {
  AuthState,
  DemoMessageAck,
  DemoSendInput,
  DialogList,
  MediaMeta,
  Message,
  MessageHistory,
  ProjectState,
  SendCodeInput,
  SendMessageInput,
  SubmitCodeInput,
  SubmitPasswordInput,
  VersionInfo,
} from '@telewa/contracts'

type Success<T> = { success: true; data: T; meta: { requestId: string } }
type Failure = {
  success: false
  error: { code: string; message: string; retryable: boolean }
  meta: { requestId: string }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {}
  if (!(init?.body instanceof FormData)) {
    headers['content-type'] = 'application/json'
  }
  const response = await fetch(path, {
    ...init,
    headers: { ...headers, ...init?.headers },
  })
  const body = (await response.json()) as Success<T> | Failure
  if (!response.ok || body.success === false) {
    throw new Error(
      body.success === false ? body.error.message : `Request failed (${response.status})`,
    )
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
  getAuthState: () => request<AuthState>('/api/auth/state'),
  sendCode: (input: SendCodeInput) =>
    request<AuthState>('/api/auth/phone/start', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  submitCode: (input: SubmitCodeInput) =>
    request<AuthState>('/api/auth/code/submit', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  submitPassword: (input: SubmitPasswordInput) =>
    request<AuthState>('/api/auth/password/submit', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  startQrLogin: () =>
    request<AuthState>('/api/auth/qr/start', {
      method: 'POST',
    }),
  logout: () =>
    request<AuthState>('/api/auth/logout', {
      method: 'POST',
    }),
  listDialogs: () =>
    request<DialogList & { currentUser: { id: string; title: string; initials: string } | null }>(
      '/api/dialogs',
    ),
  getHistory: (chatId: string, params?: { limit?: number; cursor?: string | null }) => {
    const search = new URLSearchParams()
    if (params?.limit) search.set('limit', String(params.limit))
    if (params?.cursor) search.set('cursor', params.cursor)
    const qs = search.toString()
    return request<MessageHistory>(
      `/api/messages/${encodeURIComponent(chatId)}${qs ? `?${qs}` : ''}`,
    )
  },
  sendMessage: (input: SendMessageInput) =>
    request<Message>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  uploadMedia: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    // Hono expects multi-part boundary, which browser sets automatically when content-type header is omitted.
    return request<MediaMeta>('/api/media', {
      method: 'POST',
      body: formData,
      headers: {},
    })
  },
  markRead: (chatId: string) =>
    request<{ chatId: string; marked: boolean }>(
      `/api/messages/${encodeURIComponent(chatId)}/read`,
      {
        method: 'POST',
      },
    ),
  search: (q: string) => request<import('@telewa/contracts').SearchResult>(`/api/search?q=${encodeURIComponent(q)}`),
  updateDialog: (chatId: string, updates: Partial<Pick<import('@telewa/contracts').Dialog, 'pinned' | 'muted' | 'archived' | 'unread'>>) =>
    request<import('@telewa/contracts').Dialog>(`/api/dialogs/${encodeURIComponent(chatId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteDialog: (chatId: string) =>
    request<{ chatId: string; deleted: boolean }>(`/api/dialogs/${encodeURIComponent(chatId)}`, {
      method: 'DELETE',
    }),
}
