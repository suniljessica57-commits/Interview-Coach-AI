import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { studentProfilesTable } from "./students";

export const interviewsTable = pgTable("interviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => studentProfilesTable.userId, { onDelete: "cascade" }),
  role: text("role").notNull(),
  interviewType: text("interview_type").notNull(),
  difficulty: text("difficulty").notNull(),
  topic: text("topic"),
  mode: text("mode").notNull(),
  aiMode: text("ai_mode").notNull().default("live"),
  status: text("status").notNull().default("in_progress"),
  score: doublePrecision("score"),
  questionCount: integer("question_count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const interviewQuestionsTable = pgTable(
  "interview_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interviewId: uuid("interview_id").notNull().references(() => interviewsTable.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    prompt: text("prompt").notNull(),
    topic: text("topic").notNull(),
    answer: text("answer"),
    score: real("score"),
    correctness: text("correctness"),
    clarity: text("clarity"),
    strengths: text("strengths").array().notNull().default(sql`ARRAY[]::text[]`),
    improvements: text("improvements").array().notNull().default(sql`ARRAY[]::text[]`),
    sampleAnswer: text("sample_answer"),
    isFollowUp: boolean("is_follow_up").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    interviewPositionUnique: uniqueIndex("interview_questions_interview_position_idx").on(
      table.interviewId,
      table.position,
    ),
  }),
);

export const insertInterviewSchema = createInsertSchema(interviewsTable).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});
export type InsertInterview = z.infer<typeof insertInterviewSchema>;
export type Interview = typeof interviewsTable.$inferSelect;

export const insertInterviewQuestionSchema = createInsertSchema(interviewQuestionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertInterviewQuestion = z.infer<typeof insertInterviewQuestionSchema>;
export type InterviewQuestion = typeof interviewQuestionsTable.$inferSelect;
