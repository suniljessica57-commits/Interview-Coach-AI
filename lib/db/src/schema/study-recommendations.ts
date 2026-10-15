import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { interviewsTable } from "./interviews";
import { studentProfilesTable } from "./students";

export const studyRecommendationsTable = pgTable("study_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => studentProfilesTable.userId, { onDelete: "cascade" }),
  interviewId: uuid("interview_id").references(() => interviewsTable.id, { onDelete: "set null" }),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  explanation: text("explanation").notNull(),
  practiceQuestion: text("practice_question").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull().default(15),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStudyRecommendationSchema = createInsertSchema(studyRecommendationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStudyRecommendation = z.infer<typeof insertStudyRecommendationSchema>;
export type StudyRecommendation = typeof studyRecommendationsTable.$inferSelect;
