import { pgTable, uuid, varchar, integer, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    displayName: varchar('display_name', { length: 50 }).notNull(),
    email: varchar('email', { length: 255 }).unique(),
    easyGameCount: integer('easy_game_count').default(0).notNull(),
    mediumGameCount: integer('medium_game_count').default(0).notNull(),
    hardGameCount: integer('hard_game_count').default(0).notNull(),
    extremeGameCount: integer('extreme_game_count').default(0).notNull(),
    easyHighScore: integer('easy_high_score').default(0).notNull(),
    mediumHighScore: integer('medium_high_score').default(0).notNull(),
    hardHighScore: integer('hard_high_score').default(0).notNull(),
    extremeHighScore: integer('extreme_high_score').default(0).notNull(),
    streak: integer('streak').default(0).notNull(),
    lastPlayedAt: timestamp('last_played_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const gameResults = pgTable('game_results', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    level: varchar('level', { length: 10 }).notNull(), // easy, medium, hard, extreme
    guesses: integer('guesses').notNull(),
    timeSeconds: integer('time_seconds').notNull(),
    score: integer('score').notNull(),
    won: boolean('won').notNull(),
    weekNumber: integer('week_number').notNull(), // ISO week for leaderboard
    year: integer('year').notNull(),
    targetCode: varchar('target_code', { length: 3 }), // ISO3 code of the target country
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type GameResult = typeof gameResults.$inferSelect;
export type NewGameResult = typeof gameResults.$inferInsert;
