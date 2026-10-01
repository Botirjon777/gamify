/** XP the winner gets and the loser loses. */
export const DUEL_STAKES = [10, 25, 50, 100] as const;
export const DUEL_QUESTIONS = 5;
/** Per question; answers arriving later (plus a little grace for the network) count as wrong. */
export const QUESTION_SECONDS = 45;
/** To accept an invite, and to play after accepting. */
export const DUEL_HOURS = 48;
