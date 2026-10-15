import { and, asc, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  ListRecommendationsResponse,
  UpdateRecommendationBody,
  UpdateRecommendationParams,
  UpdateRecommendationResponse,
} from "@workspace/api-zod";
import { db, studyRecommendationsTable } from "@workspace/db";

const router: IRouter = Router();

function serializeRecommendation(
  recommendation: typeof studyRecommendationsTable.$inferSelect,
) {
  return {
    id: recommendation.id,
    topic: recommendation.topic,
    title: recommendation.title,
    explanation: recommendation.explanation,
    practiceQuestion: recommendation.practiceQuestion,
    estimatedMinutes: recommendation.estimatedMinutes,
    completed: recommendation.completed,
    createdAt: recommendation.createdAt.toISOString(),
  };
}

router.get("/recommendations", async (req, res): Promise<void> => {
  const recommendations = await db
    .select()
    .from(studyRecommendationsTable)
    .where(eq(studyRecommendationsTable.userId, req.userId!))
    .orderBy(
      asc(studyRecommendationsTable.completed),
      desc(studyRecommendationsTable.createdAt),
    );
  res.json(
    ListRecommendationsResponse.parse(
      recommendations.map(serializeRecommendation),
    ),
  );
});

router.patch(
  "/recommendations/:recommendationId",
  async (req, res): Promise<void> => {
    const params = UpdateRecommendationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = UpdateRecommendationBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const [recommendation] = await db
      .update(studyRecommendationsTable)
      .set({ completed: body.data.completed })
      .where(
        and(
          eq(studyRecommendationsTable.id, params.data.recommendationId),
          eq(studyRecommendationsTable.userId, req.userId!),
        ),
      )
      .returning();
    if (!recommendation) {
      res.status(404).json({ error: "Study recommendation not found" });
      return;
    }

    res.json(
      UpdateRecommendationResponse.parse(
        serializeRecommendation(recommendation),
      ),
    );
  },
);

export default router;
