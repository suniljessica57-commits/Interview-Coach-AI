import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CompleteInterviewParams,
  CompleteInterviewResponse,
  CreateInterviewBody,
  CreateInterviewResponse,
  GetInterviewParams,
  GetInterviewResponse,
  GetNextInterviewQuestionParams,
  GetNextInterviewQuestionResponse,
  ListInterviewsResponse,
  SubmitInterviewAnswerBody,
  SubmitInterviewAnswerParams,
  SubmitInterviewAnswerResponse,
} from "@workspace/api-zod";
import {
  db,
  interviewQuestionsTable,
  interviewsTable,
  studyRecommendationsTable,
} from "@workspace/db";
import {
  evaluateAnswer,
  generateOpeningQuestions,
} from "../lib/interview-ai";
import {
  getAnsweredCounts,
  getInterviewDetail,
  getOwnedInterview,
  getQuestionRows,
  serializeInterview,
  serializeQuestion,
} from "../lib/interview-data";

const router: IRouter = Router();

function mapRecommendation(recommendation: typeof studyRecommendationsTable.$inferSelect) {
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

router.get("/interviews", async (req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(interviewsTable)
    .where(eq(interviewsTable.userId, req.userId!))
    .orderBy(asc(interviewsTable.createdAt));
  const answeredCounts = await getAnsweredCounts(sessions.map((session) => session.id));
  res.json(
    ListInterviewsResponse.parse(
      sessions
        .reverse()
        .map((session) =>
          serializeInterview(session, answeredCounts.get(session.id) ?? 0),
        ),
    ),
  );
});

router.post("/interviews", async (req, res): Promise<void> => {
  const parsed = CreateInterviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = parsed.data;
  try {
    const generated = await generateOpeningQuestions({
      role: input.role,
      interviewType: input.interviewType,
      difficulty: input.difficulty,
      topic: input.topic,
      questionCount: input.questionCount,
    });
    const [interview] = await db
      .insert(interviewsTable)
      .values({
        userId: req.userId!,
        role: input.role,
        interviewType: input.interviewType,
        difficulty: input.difficulty,
        topic: input.topic,
        mode: input.mode,
        aiMode: generated.aiMode,
        questionCount: input.questionCount,
      })
      .returning();
    await db.insert(interviewQuestionsTable).values(
      generated.questions.map((question, index) => ({
        interviewId: interview.id,
        position: index,
        prompt: question.prompt,
        topic: question.topic,
      })),
    );

    const detail = await getInterviewDetail(interview);
    res.status(201).json(CreateInterviewResponse.parse(detail));
  } catch (error) {
    req.log.error({ error }, "Unable to create interview");
    res.status(502).json({
      error: "Interview questions could not be generated. Please try again.",
    });
  }
});

router.get("/interviews/:interviewId", async (req, res): Promise<void> => {
  const params = GetInterviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const interview = await getOwnedInterview(params.data.interviewId, req.userId!);
  if (!interview) {
    res.status(404).json({ error: "Interview not found" });
    return;
  }
  res.json(GetInterviewResponse.parse(await getInterviewDetail(interview)));
});

router.post(
  "/interviews/:interviewId/questions/:questionId/answers",
  async (req, res): Promise<void> => {
    const params = SubmitInterviewAnswerParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = SubmitInterviewAnswerBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const interview = await getOwnedInterview(
      params.data.interviewId,
      req.userId!,
    );
    if (!interview) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }
    const [question] = await db
      .select()
      .from(interviewQuestionsTable)
      .where(
        and(
          eq(interviewQuestionsTable.id, params.data.questionId),
          eq(interviewQuestionsTable.interviewId, interview.id),
        ),
      )
      .limit(1);
    if (!question) {
      res.status(404).json({ error: "Interview question not found" });
      return;
    }

    try {
      const evaluation = await evaluateAnswer({
        role: interview.role,
        difficulty: interview.difficulty,
        topic: question.topic,
        question: question.prompt,
        answer: body.data.answer,
      });
      const [savedQuestion] = await db
        .update(interviewQuestionsTable)
        .set({
          answer: body.data.answer,
          score: evaluation.score,
          correctness: evaluation.correctness,
          clarity: evaluation.clarity,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          sampleAnswer: evaluation.sampleAnswer,
        })
        .where(eq(interviewQuestionsTable.id, question.id))
        .returning();

      if (evaluation.followUpPrompt) {
        const [nextUnanswered] = await db
          .select()
          .from(interviewQuestionsTable)
          .where(
            and(
              eq(interviewQuestionsTable.interviewId, interview.id),
              gt(interviewQuestionsTable.position, question.position),
              isNull(interviewQuestionsTable.answer),
            ),
          )
          .orderBy(asc(interviewQuestionsTable.position))
          .limit(1);
        if (nextUnanswered) {
          await db
            .update(interviewQuestionsTable)
            .set({
              prompt: evaluation.followUpPrompt,
              topic: question.topic,
              isFollowUp: true,
            })
            .where(eq(interviewQuestionsTable.id, nextUnanswered.id));
        }
      }

      const questionRows = await getQuestionRows(interview.id);
      const answeredCount = questionRows.filter((row) => row.answer !== null).length;
      res.json(
        SubmitInterviewAnswerResponse.parse({
          question: serializeQuestion(savedQuestion),
          nextQuestionAvailable: answeredCount < questionRows.length,
        }),
      );
    } catch (error) {
      req.log.error({ error, interviewId: interview.id }, "Unable to evaluate answer");
      res.status(502).json({
        error: "Answer feedback could not be generated. Your answer was not scored.",
      });
    }
  },
);

router.post(
  "/interviews/:interviewId/next-question",
  async (req, res): Promise<void> => {
    const params = GetNextInterviewQuestionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const interview = await getOwnedInterview(
      params.data.interviewId,
      req.userId!,
    );
    if (!interview) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }

    const [question] = await db
      .select()
      .from(interviewQuestionsTable)
      .where(
        and(
          eq(interviewQuestionsTable.interviewId, interview.id),
          isNull(interviewQuestionsTable.answer),
        ),
      )
      .orderBy(asc(interviewQuestionsTable.position))
      .limit(1);
    res.json(
      GetNextInterviewQuestionResponse.parse({
        question: question ? serializeQuestion(question) : null,
        isComplete: !question,
      }),
    );
  },
);

router.post(
  "/interviews/:interviewId/complete",
  async (req, res): Promise<void> => {
    const params = CompleteInterviewParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const interview = await getOwnedInterview(
      params.data.interviewId,
      req.userId!,
    );
    if (!interview) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }

    const questionRows = await getQuestionRows(interview.id);
    const answered = questionRows.filter(
      (question) => question.answer !== null && question.score !== null,
    );
    const score =
      answered.length > 0
        ? Math.round(
            answered.reduce((total, question) => total + (question.score ?? 0), 0) /
              answered.length,
          )
        : 0;
    let completedInterview = interview;
    if (interview.status !== "completed") {
      const [updated] = await db
        .update(interviewsTable)
        .set({ status: "completed", score, completedAt: new Date() })
        .where(
          and(
            eq(interviewsTable.id, interview.id),
            eq(interviewsTable.userId, req.userId!),
          ),
        )
        .returning();
      completedInterview = updated;

      const byTopic = new Map<string, (typeof answered)[number]>();
      for (const question of answered) {
        if ((question.score ?? 0) < 70 && !byTopic.has(question.topic)) {
          byTopic.set(question.topic, question);
        }
      }
      const weakQuestions = [...byTopic.values()].slice(0, 3);
      if (weakQuestions.length > 0) {
        await db.insert(studyRecommendationsTable).values(
          weakQuestions.map((question) => ({
            userId: req.userId!,
            interviewId: interview.id,
            topic: question.topic,
            title: `Strengthen your ${question.topic} answers`,
            explanation:
              question.improvements[0] ??
              "Review this topic and add a specific example to your next answer.",
            practiceQuestion: question.prompt,
            estimatedMinutes: 15,
          })),
        );
      }
    }

    const recommendations = await db
      .select()
      .from(studyRecommendationsTable)
      .where(
        and(
          eq(studyRecommendationsTable.userId, req.userId!),
          eq(studyRecommendationsTable.interviewId, interview.id),
        ),
      )
      .orderBy(asc(studyRecommendationsTable.createdAt));
    const strengths = [
      ...new Set(answered.flatMap((question) => question.strengths)),
    ].slice(0, 5);
    const weakTopics = [
      ...new Set(
        answered
          .filter((question) => (question.score ?? 0) < 70)
          .map((question) => question.topic),
      ),
    ].slice(0, 5);

    res.json(
      CompleteInterviewResponse.parse({
        interview: await getInterviewDetail(completedInterview),
        overallScore: completedInterview.score ?? score,
        strengths,
        weakTopics,
        recommendations: recommendations.map(mapRecommendation),
      }),
    );
  },
);

export default router;
