import { z } from 'zod'

// Existing schemas
export const versionInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  phase: z.string(),
  demoMode: z.boolean(),
  uiIntegration: z.literal('uploaded-whatsapp-inspired-design'),
})

export const projectStateSchema = z.object({
  activePhase: z.string(),
  status: z.string(),
  uiStatus: z.string(),
  implemented: z.array(z.string()),
  mocked: z.array(z.string()),
  nextTask: z.string(),
})

// Legacy demo schema retained for backwards-compatible UI smoke tests.
export const demoSendSchema = z.object({
  chatId: z.string().min(1),
  text: z.string().trim().min(1).max(4096),
  clientOperationId: z.string().min(8).max(128),
  replyTo: z.string().optional(),
})

export const demoMessageAckSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  clientOperationId: z.string(),
  acceptedAt: z.string(),
  status: z.literal('sent'),
})

// Authentication Schemas
export const authStateSchema = z.object({
  status: z.enum([
    'unauthenticated',
    'requires_code',
    'requires_password',
    'requires_qr',
    'authenticated',
  ]),
  phoneNumber: z.string().optional(),
  qrCodeUrl: z.string().optional(),
  error: z.string().optional(),
})

export const sendCodeSchema = z.object({
  phone: z.string().min(5).max(30),
})

export const submitCodeSchema = z.object({
  code: z.string().min(4).max(10),
})

export const submitPasswordSchema = z.object({
  password: z.string().min(1),
})

// Dialog Schemas
export const peerSchema = z.object({
  id: z.string(),
  type: z.enum(['user', 'group', 'channel']),
  title: z.string(),
  initials: z.string(),
  avatarColor: z.string().optional(),
  verified: z.boolean().optional(),
  about: z.string().optional(),
  online: z.boolean().optional(),
  lastSeenAt: z.string().optional(),
  members: z.number().int().optional(),
})

export const lastMessageSchema = z.object({
  id: z.string(),
  text: z.string(),
  sentAt: z.string(),
  senderId: z.string(),
  outbox: z.boolean(),
})

export const dialogSchema = z.object({
  id: z.string(),
  peer: peerSchema,
  lastMessage: lastMessageSchema.nullable(),
  unread: z.number().int().min(0).default(0),
  pinned: z.boolean().default(false),
  muted: z.boolean().default(false),
  archived: z.boolean().default(false),
  typingPeerId: z.string().optional(),
})

export const dialogListSchema = z.object({
  dialogs: z.array(dialogSchema),
  total: z.number().int(),
})

// Messaging Schemas
export const messageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  senderId: z.string(),
  outbox: z.boolean(),
  text: z.string(),
  sentAt: z.string(),
  status: z.enum(['sending', 'sent', 'delivered', 'read', 'failed']),
  replyTo: z.string().optional(),
  kind: z
    .enum(['text', 'image', 'video', 'document', 'voice', 'sticker', 'system', 'reply'])
    .default('text'),
  clientOperationId: z.string().optional(),
  mediaId: z.string().optional(),
  mediaMime: z.string().optional(),
  mediaName: z.string().optional(),
  mediaSize: z.number().int().nonnegative().optional(),
  mediaDuration: z.number().nonnegative().optional(),
})

// Media Schemas
export const mediaMetaSchema = z.object({
  id: z.string(),
  mime: z.string(),
  name: z.string(),
  size: z.number().int().nonnegative(),
  uploadedAt: z.string(),
  kind: z.enum(['image', 'video', 'document', 'voice', 'sticker']),
  duration: z.number().nonnegative().optional(),
})

export const messageHistorySchema = z.object({
  chatId: z.string(),
  messages: z.array(messageSchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
})

export const sendMessageSchema = z
  .object({
    chatId: z.string().min(1),
    text: z.string().trim().max(4096).default(''),
    clientOperationId: z.string().min(8).max(128),
    replyTo: z.string().optional(),
    mediaId: z.string().optional(),
    mediaMime: z.string().optional(),
    mediaName: z.string().optional(),
    mediaSize: z.number().int().nonnegative().optional(),
    mediaDuration: z.number().nonnegative().optional(),
  })
  .refine((v) => v.text.length > 0 || !!v.mediaId, {
    message: 'Either text or mediaId must be provided',
  })

// Real-time Schemas
export const realtimeEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('message.new'),
    chatId: z.string(),
    message: messageSchema,
  }),
  z.object({
    type: z.literal('message.update'),
    chatId: z.string(),
    messageId: z.string(),
    status: messageSchema.shape.status,
  }),
  z.object({
    type: z.literal('dialog.update'),
    dialog: dialogSchema,
  }),
  z.object({
    type: z.literal('presence'),
    peerId: z.string(),
    online: z.boolean(),
  }),
  z.object({
    type: z.literal('ping'),
    sentAt: z.string(),
  }),
])

export type RealtimeEvent = z.infer<typeof realtimeEventSchema>

export type VersionInfo = z.infer<typeof versionInfoSchema>
export type ProjectState = z.infer<typeof projectStateSchema>
export type DemoSendInput = z.infer<typeof demoSendSchema>
export type DemoMessageAck = z.infer<typeof demoMessageAckSchema>

export type AuthState = z.infer<typeof authStateSchema>
export type SendCodeInput = z.infer<typeof sendCodeSchema>
export type SubmitCodeInput = z.infer<typeof submitCodeSchema>
export type SubmitPasswordInput = z.infer<typeof submitPasswordSchema>

export type Peer = z.infer<typeof peerSchema>
export type LastMessage = z.infer<typeof lastMessageSchema>
export type Dialog = z.infer<typeof dialogSchema>
export type DialogList = z.infer<typeof dialogListSchema>

export type Message = z.infer<typeof messageSchema>
export type MessageHistory = z.infer<typeof messageHistorySchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type MediaMeta = z.infer<typeof mediaMetaSchema>
