import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const studentProfilesTable = pgTable("student_profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull().default("Student"),
  targetRole: text("target_role").notNull().default("Software Engineer"),
  experienceLevel: text("experience_level"),
  school: text("school"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStudentProfileSchema = createInsertSchema(studentProfilesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;
export type StudentProfile = typeof studentProfilesTable.$inferSelect;
