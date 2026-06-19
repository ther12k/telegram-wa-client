import { z } from 'zod'

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

export type VersionInfo = z.infer<typeof versionInfoSchema>
export type ProjectState = z.infer<typeof projectStateSchema>
export type DemoSendInput = z.infer<typeof demoSendSchema>
export type DemoMessageAck = z.infer<typeof demoMessageAckSchema>
