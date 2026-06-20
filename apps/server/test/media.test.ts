import { describe, expect, it, beforeEach } from 'vitest'
import app, { telegramAdapter } from '../src/app'

async function signIn() {
  await telegramAdapter.sendCode('+141****0199')
  await telegramAdapter.submitCode('11111')
}

describe('media API', () => {
  beforeEach(async () => {
    await telegramAdapter.logout()
  })

  it('rejects upload when unauthenticated', async () => {
    const formData = new FormData()
    const blob = new Blob(['hello world'], { type: 'text/plain' })
    formData.append('file', blob, 'test.txt')

    const res = await app.request('/api/media', {
      method: 'POST',
      body: formData,
    })
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error.code).toBe('AUTH_REQUIRED')
  })

  it('allows upload and returns metadata once authenticated', async () => {
    await signIn()

    const formData = new FormData()
    const blob = new Blob(['test image data'], { type: 'image/png' })
    formData.append('file', blob, 'avatar.png')

    const res = await app.request('/api/media', {
      method: 'POST',
      body: formData,
    })
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.data.id).toBeDefined()
    expect(body.data.name).toBe('avatar.png')
    expect(body.data.mime).toBe('image/png')
    expect(body.data.size).toBe(15) // bytes
    expect(body.data.kind).toBe('image')
    expect(body.data.uploadedAt).toBeDefined()
  })

  it('rejects uploads missing the file field', async () => {
    await signIn()
    const formData = new FormData()
    formData.append('not_file', 'something')

    const res = await app.request('/api/media', {
      method: 'POST',
      body: formData,
    })
    const body = await res.json()
    expect(res.status).toBe(422)
    expect(body.error.code).toBe('UPLOAD_MISSING_FILE')
  })

  it('rejects download when unauthenticated', async () => {
    const res = await app.request('/api/media/some-id')
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error.code).toBe('AUTH_REQUIRED')
  })

  it('allows downloading uploaded files when authenticated', async () => {
    await signIn()

    // 1. Upload
    const formData = new FormData()
    const blob = new Blob(['my document data'], { type: 'application/pdf' })
    formData.append('file', blob, 'resume.pdf')

    const uploadRes = await app.request('/api/media', {
      method: 'POST',
      body: formData,
    })
    const uploadBody = await uploadRes.json()
    const id = uploadBody.data.id

    // 2. Download
    const downloadRes = await app.request(`/api/media/${id}`)
    expect(downloadRes.status).toBe(200)
    expect(downloadRes.headers.get('Content-Type')).toBe('application/pdf')
    expect(downloadRes.headers.get('Content-Disposition')).toContain('resume.pdf')
    const text = await downloadRes.text()
    expect(text).toBe('my document data')
  })

  it('returns 404 for non-existent files', async () => {
    await signIn()
    const res = await app.request('/api/media/non-existent-uuid')
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error.code).toBe('MEDIA_NOT_FOUND')
  })
})
