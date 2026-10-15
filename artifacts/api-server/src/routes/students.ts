import { asc, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetDashboardResponse,
  GetMyProfileResponse,
  UpdateMyProfileBody,
  UpdateMyProfileResponse,
} from "@workspace/api-zod";
import {
  db,
  interviewsTable,
  studentProfilesTable,
  studyRecommendationsTable,
} from "@workspace/db";
import {
  getAnsweredCounts,
  serializeInterview,
} from "../lib/interview-data";

const router: IRouter = Router();

async function ensureProfile(userId: string) {
  await db
    .insert(studentProfilesTable)
    .values({ userId })
    .onConflictDoNothing({ target: studentProfilesTable.userId });
  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, userId))
    .limit(1);
  return profile;
}

function serializeProfile(profile: NonNullable<Awaited<ReturnType<typeof ensureProfile>>>) {
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    targetRole: profile.targetRole,
    experienceLevel: profile.experienceLevel,
    school: profile.school,
  };
}

function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function currentStreak(completedAtDates: Date[]): number {
  const activeDays = new Set(completedAtDates.map(toDay));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (!activeDays.has(toDay(today))) today.setUTCDate(today.getUTCDate() - 1);

  let streak = 0;
  while (activeDays.has(toDay(today))) {
    streak += 1;
    today.setUTCDate(today.getUTCDate() - 1);
  }
  return streak;
}

router.get("/me", async (req, res): Promise<void> => {
  const profile = await ensureProfile(req.userId!);
  res.json(GetMyProfileResponse.parse(serializeProfile(profile)));
});

router.put("/me", async (req, res): Promise<void> => {
  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [profile] = await db
    .insert(studentProfilesTable)
    .values({ userId: req.userId!, ...parsed.data })
    .onConflictDoUpdate({
      target: studentProfilesTable.userId,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();

  res.json(UpdateMyProfileResponse.parse(serializeProfile(profile)));
});

router.get("/dashboard", async (req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(interviewsTable)
    .where(eq(interviewsTable.userId, req.userId!))
    .orderBy(desc(interviewsTable.createdAt));
  const answeredCounts = await getAnsweredCounts(sessions.map((session) => session.id));
  const completed = sessions.filter(
    (session) => session.status === "completed" && session.score !== null,
  );
  const scores = completed.map((session) => session.score ?? 0);
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
      : 0;

  const dailyScores = new Map<string, number[]>();
  for (const session of completed) {
    if (!session.completedAt) continue;
    const day = toDay(session.completedAt);
    const dayScores = dailyScores.get(day) ?? [];
    dayScores.push(session.score ?? 0);
    dailyScores.set(day, dayScores);
  }
  const scoreTrend = [...dailyScores.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .slice(-7)
    .map(([date, dayScores]) => ({
      date,
      score: Math.round(
        dayScores.reduce((total, score) => total + score, 0) / dayScores.length,
      ),
    }));

  const recommendations = await db
    .select()
    .from(studyRecommendationsTable)
    .where(eq(studyRecommendationsTable.userId, req.userId!))
    .orderBy(asc(studyRecommendationsTable.completed), desc(studyRecommendationsTable.createdAt))
    .limit(4);

  res.json(
    GetDashboardResponse.parse({
      completedSessions: completed.length,
      averageScore,
      practiceMinutes: sessions.reduce(
        (total, session) =>
          total + (answeredCounts.get(session.id) ?? 0) * 3,
        0,
      ),
      currentStreak: currentStreak(
        completed.flatMap((session) => session.completedAt ? [session.completedAt] : []),
      ),
      scoreTrend,
      recentSessions: sessions
        .slice(0, 5)
        .map((session) =>
          serializeInterview(session, answeredCounts.get(session.id) ?? 0),
        ),
      recommendations: recommendations.map((recommendation) => ({
        id: recommendation.id,
        topic: recommendation.topic,
        title: recommendation.title,
        explanation: recommendation.explanation,
        practiceQuestion: recommendation.practiceQuestion,
        estimatedMinutes: recommendation.estimatedMinutes,
        completed: recommendation.completed,
        createdAt: recommendation.createdAt.toISOString(),
      })),
    }),
  );
});

export default router;
