import { z } from "zod";
import { TOPIC_KEYS, type Topic } from "./topics";

// gemma4 に出力させる課題まとめの形（サーバ・クライアント共通）

const topicEnum = z.enum(TOPIC_KEYS as [Topic, ...Topic[]]);

export const summarySchema = z.object({
  overview: z.string(),
  issues: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      topic: topicEnum,
      severity: z.number().int().min(1).max(5),
      evidence: z.array(z.string()),
    }),
  ),
  recommended_offerings: z.array(topicEnum),
  unknowns: z.array(z.string()),
  next_actions: z.array(z.string()),
  appointment_pitch: z.string(),
});

export type Summary = z.infer<typeof summarySchema>;
