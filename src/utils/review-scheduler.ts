export const ReviewIntervals = {
  0: 1,   // Day 1
  1: 3,   // Day 3
  2: 7,   // Day 7
  3: 14,  // Day 14
  4: 30,  // Day 30
  5: -1   // Mastered (no more reviews)
} as const;

export function isReviewLate(scheduledDate: string): boolean {
  const scheduled = new Date(scheduledDate);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff > 3;
}

export function getNextReviewStage(
  currentStage: number, 
  isCorrect: boolean, 
  isLate: boolean
): number {
  if (!isCorrect || isLate) return 0;
  return Math.min(currentStage + 1, 5);
}

export function getReviewIntervalDays(stage: number): number {
  return ReviewIntervals[stage as keyof typeof ReviewIntervals] || 30;
}

export function calculateNextReviewDate(fromDate: Date, stage: number): Date {
  const intervalDays = getReviewIntervalDays(stage);
  if (intervalDays === -1) {
    // Mastered - set far future date
    const farFuture = new Date(fromDate);
    farFuture.setFullYear(farFuture.getFullYear() + 10);
    return farFuture;
  }
  
  const nextDate = new Date(fromDate);
  nextDate.setDate(nextDate.getDate() + intervalDays);
  return nextDate;
}

export function formatReviewDate(date: Date): string {
  return date.toISOString();
}

export function getDaysUntilReview(nextReviewDate: string): number {
  const reviewDate = new Date(nextReviewDate);
  const now = new Date();
  const daysDiff = Math.floor((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff;
}

export function getReviewStatus(nextReviewDate: string): 'due' | 'upcoming' | 'late' {
  const daysUntil = getDaysUntilReview(nextReviewDate);
  if (daysUntil < 0) return 'late';
  if (daysUntil === 0) return 'due';
  return 'upcoming';
}

export function getStageLabel(stage: number): string {
  const labels = {
    0: 'New',
    1: 'Learning',
    2: 'Familiar',
    3: 'Known',
    4: 'Well-known',
    5: 'Mastered'
  };
  return labels[stage as keyof typeof labels] || 'Unknown';
}