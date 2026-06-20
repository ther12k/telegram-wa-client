import { Hono } from 'hono'
import { mediaMetaSchema } from '@telewa/contracts'
import crypto from 'node:crypto'

// In-memory store for blobs/meta
export interface MediaStore {
  save(
    filename: string,
    mime: string,
    buffer: Uint8Array,
  ): Promise<{ id: string; name: string; mime: string; size: number; uploadedAt: string }>
  get(id: string): Promise<{ buffer: Uint8Array; mime: string; name: string } | null>
}

export class InMemoryMediaStore implements MediaStore {
  private files = new Map<
    string,
    { buffer: Uint8Array; name: string; mime: string; uploadedAt: string }
  >()

  async save(filename: string, mime: string, buffer: Uint8Array) {
    const id = crypto.randomUUID()
    const uploadedAt = new Date().toISOString()
    this.files.set(id, { buffer, name: filename, mime, uploadedAt })
    return { id, name: filename, mime, size: buffer.length, uploadedAt }
  }

  async get(id: string) {
    const item = this.files.get(id)
    if (!item) return null
    return { buffer: item.buffer, mime: item.mime, name: item.name }
  }
}

export function createMediaRouter(store: MediaStore, isAuthenticated: () => Promise<boolean>) {
  const router = new Hono<{ Variables: { requestId: string } }>()

  // POST /api/media — multipart file upload
  router.post('/', async (c) => {
    if (!(await isAuthenticated())) {
      return c.json(
        {
          success: false as const,
          error: { code: 'AUTH_REQUIRED', message: 'Sign in to upload media.', retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        401,
      )
    }

    try {
      const body = await c.req.parseBody()
      const fileField = body['file']
      if (!fileField || !(fileField instanceof File)) {
        return c.json(
          {
            success: false as const,
            error: {
              code: 'UPLOAD_MISSING_FILE',
              message: 'A file field named "file" is required.',
              retryable: false,
            },
            meta: { requestId: c.get('requestId') },
          },
          422,
        )
      }

      const buffer = new Uint8Array(await fileField.arrayBuffer())
      const meta = await store.save(fileField.name, fileField.type, buffer)

      // Determine kind based on mime
      let kind: 'image' | 'video' | 'document' | 'voice' | 'sticker' = 'document'
      const mime = fileField.type.toLowerCase()
      if (mime.startsWith('image/')) {
        kind = 'image'
      } else if (mime.startsWith('video/')) {
        kind = 'video'
      } else if (mime.startsWith('audio/')) {
        kind = 'voice'
      }

      const payload = {
        id: meta.id,
        mime: meta.mime,
        name: meta.name,
        size: meta.size,
        uploadedAt: meta.uploadedAt,
        kind,
      }

      const validated = mediaMetaSchema.parse(payload)

      return c.json(
        {
          success: true as const,
          data: validated,
          meta: { requestId: c.get('requestId') },
        },
        201,
      )
    } catch (err) {
      return c.json(
        {
          success: false as const,
          error: {
            code: 'UPLOAD_FAILED',
            message: err instanceof Error ? err.message : 'Upload failed.',
            retryable: false,
          },
          meta: { requestId: c.get('requestId') },
        },
        500,
      )
    }
  })

  // GET /api/media/:id — download proxy
  router.get('/:id', async (c) => {
    // Let unauthorized requests download if link matches (standard media access)
    if (!(await isAuthenticated())) {
      return c.json(
        {
          success: false as const,
          error: { code: 'AUTH_REQUIRED', message: 'Sign in to access media.', retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        401,
      )
    }

    const id = c.req.param('id')
    if (!id) {
      return c.json(
        {
          success: false as const,
          error: { code: 'MEDIA_ID_REQUIRED', message: 'Media id is required.', retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        422,
      )
    }

    const media = await store.get(id)
    if (!media) {
      return c.json(
        {
          success: false as const,
          error: { code: 'MEDIA_NOT_FOUND', message: 'Media file not found.', retryable: false },
          meta: { requestId: c.get('requestId') },
        },
        404,
      )
    }

    c.header('Content-Type', media.mime)
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(media.name)}"`)
    // Hono's c.body accepts ArrayBuffer for binary data.
    return c.body(
      media.buffer.buffer.slice(
        media.buffer.byteOffset,
        media.buffer.byteOffset + media.buffer.byteLength,
      ) as ArrayBuffer,
    )
  })

  return router
}
