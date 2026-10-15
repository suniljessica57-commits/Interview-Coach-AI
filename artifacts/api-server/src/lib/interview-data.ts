import { and, asc, eq, inArray } from "drizzle-orm";
import {
  db,
  interviewQuestionsTable,
  interviewsTable,
} from "@workspace/db";

export type InterviewRow = typeof interviewsTable.$inferSelect;
export type InterviewQuestionRow = typeof interviewQuestionsTable.$inferSelect;

export function serializeInterview(
  interview: InterviewRow,
  answeredCount: number,
) {
  return {
    id: interview.id,
    role: interview.role,
    interviewType: interview.interviewType,
    difficulty: interview.difficulty,
    topic: interview.topic,
    mode: interview.mode,
    aiMode: interview.aiMode,
    status: interview.status,
    score: interview.score,
    questionCount: interview.questionCount,
    answeredCount,
    createdAt: interview.createdAt.toISOString(),
    completedAt: interview.completedAt?.toISOString() ?? null,
  };
}

export function serializeQuestion(question: InterviewQuestionRow) {
  return {
    id: question.id,
    position: question.position,
    prompt: question.prompt,
    topic: question.topic,
    answer: question.answer,
    score: question.score,
    correctness: question.correctness,
    clarity: question.clarity,
    strengths: question.strengths,
    improvements: question.improvements,
    sampleAnswer: question.sampleAnswer,
    isFollowUp: question.isFollowUp,
  };
}

export async function getQuestionRows(interviewId: string) {
  return db
    .select()
    .from(interviewQuestionsTable)
    .where(eq(interviewQuestionsTable.interviewId, interviewId))
    .orderBy(asc(interviewQuestionsTable.position));
}

export async function getInterviewDetail(interview: InterviewRow) {
  const questions = await getQuestionRows(interview.id);
  return {
    ...serializeInterview(
      interview,
      questions.filter((question) => question.answer !== null).length,
    ),
    questions: questions.map(serializeQuestion),
  };
}

export async function getOwnedInterview(
  interviewId: string,
  userId: string,
): Promise<InterviewRow | undefined> {
  const [interview] = await db
    .select()
    .from(interviewsTable)
    .where(
      and(
        eq(interviewsTable.id, interviewId),
        eq(interviewsTable.userId, userId),
      ),
    )
    .limit(1);
  return interview;
}

export async function getAnsweredCounts(interviewIds: string[]) {
  const counts = new Map<string, number>();
  if (interviewIds.length === 0) return counts;

  const rows = await db
    .select({
      interviewId: interviewQuestionsTable.interviewId,
      answer: interviewQuestionsTable.answer,
    })
    .from(interviewQuestionsTable)
    .where(inArray(interviewQuestionsTable.interviewId, interviewIds));
  for (const row of rows) {
    if (row.answer !== null) {
      counts.set(row.interviewId, (counts.get(row.interviewId) ?? 0) + 1);
    }
  }
  return counts;
}
