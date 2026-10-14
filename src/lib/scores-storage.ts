import type { LocalDemoScoreRecord } from '../types';

const REAL_LOCAL_SCORES_KEY = 'chogsignal_local_demo_scores_v1';
const SIMULATED_JUDGE_SCORES_KEY = 'chogsignal_simulated_judge_demo_scores_v1';

export const INITIAL_SCORE_RECORD: LocalDemoScoreRecord = {
  totalXp: 0,
  casesAudited: 0,
  correctVerdicts: 0,
  accuracyRate: 0,
  lastVerdictTimestamp: 0,
  badges: []
};

/**
 * Loads Local Demo Scores from browser storage.
 * Strictly segregates real user scores from simulated judge scores.
 */
export function getLocalDemoScores(isSimulatedJudge: boolean = false): LocalDemoScoreRecord {
  if (typeof window === 'undefined') {
    return { ...INITIAL_SCORE_RECORD };
  }

  const key = isSimulatedJudge ? SIMULATED_JUDGE_SCORES_KEY : REAL_LOCAL_SCORES_KEY;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { ...INITIAL_SCORE_RECORD };
    const parsed = JSON.parse(raw);
    return {
      totalXp: Number(parsed.totalXp || 0),
      casesAudited: Number(parsed.casesAudited || 0),
      correctVerdicts: Number(parsed.correctVerdicts || 0),
      accuracyRate: Number(parsed.accuracyRate || 0),
      lastVerdictTimestamp: Number(parsed.lastVerdictTimestamp || 0),
      badges: Array.isArray(parsed.badges) ? parsed.badges : []
    };
  } catch {
    return { ...INITIAL_SCORE_RECORD };
  }
}

/**
 * Updates Local Demo Scores following an evaluated verdict.
 * Prevents simulated judge scores from writing to real user records.
 */
export function recordVerdictToLocalDemoScores(
  isCorrect: boolean,
  xpEarned: number,
  isSimulatedJudge: boolean = false
): LocalDemoScoreRecord {
  if (typeof window === 'undefined') {
    return { ...INITIAL_SCORE_RECORD };
  }

  const current = getLocalDemoScores(isSimulatedJudge);
  const updatedCases = current.casesAudited + 1;
  const updatedCorrect = current.correctVerdicts + (isCorrect ? 1 : 0);
  const updatedXp = current.totalXp + (isCorrect ? xpEarned : 0);
  const updatedAccuracy = Math.round((updatedCorrect / updatedCases) * 100);

  const updatedBadges = [...current.badges];
  if (updatedCorrect >= 1 && !updatedBadges.includes('First Case Solved')) {
    updatedBadges.push('First Case Solved');
  }
  if (updatedCorrect >= 3 && !updatedBadges.includes('Curve Auditor')) {
    updatedBadges.push('Curve Auditor');
  }

  const updatedRecord: LocalDemoScoreRecord = {
    totalXp: updatedXp,
    casesAudited: updatedCases,
    correctVerdicts: updatedCorrect,
    accuracyRate: updatedAccuracy,
    lastVerdictTimestamp: Date.now(),
    badges: updatedBadges
  };

  const key = isSimulatedJudge ? SIMULATED_JUDGE_SCORES_KEY : REAL_LOCAL_SCORES_KEY;
  try {
    window.localStorage.setItem(key, JSON.stringify(updatedRecord));
  } catch {
    // LocalStorage quota or access error
  }

  return updatedRecord;
}
