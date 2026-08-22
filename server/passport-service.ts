import { pool } from "./db";

type PassportEventInput = {
  userId: string;
  app: string;
  eventType: string;
  title: string;
  detail?: string;
  xp?: number;
  metadata?: Record<string, unknown>;
};

export async function recordPassportEvent({
  userId,
  app,
  eventType,
  title,
  detail = "",
  xp = 0,
  metadata = {},
}: PassportEventInput) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Find the Member's Passport.
    const passportResult = await client.query(
      `
      SELECT id, passport_id, passport_level, passport_xp
      FROM user_passports
      WHERE user_id = $1
      LIMIT 1
      `,
      [userId],
    );

    const passport = passportResult.rows[0];

    if (!passport) {
      throw new Error("Passport not found for Member");
    }

    // Record the real activity.
    const eventResult = await client.query(
      `
      INSERT INTO passport_events (
        passport_id,
        app,
        event_type,
        title,
        detail,
        xp_awarded,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING *
      `,
      [
        passport.id,
        app,
        eventType,
        title,
        detail,
        xp,
        JSON.stringify(metadata),
      ],
    );

    // Add earned XP.
    const newXp = Number(passport.passport_xp) + xp;

    // Phase 1 progression:
    // every 1000 XP = another Passport level.
    const newLevel = Math.floor(newXp / 1000) + 1;

    await client.query(
      `
      UPDATE user_passports
      SET
        passport_xp = $1,
        passport_level = $2,
        updated_at = NOW()
      WHERE id = $3
      `,
      [newXp, newLevel, passport.id],
    );

    // Check achievements whose app + trigger match this event.
    //
    // For our first achievements we map the event types directly.
    const achievementSlugByEvent: Record<string, string> = {
      first_boot: "first-boot",
      game_joined: "game-on",
      world_entered: "explorer",
    };

    const achievementSlug = achievementSlugByEvent[eventType];

    let unlockedAchievement = null;

    if (achievementSlug) {
      const achievementResult = await client.query(
        `
        SELECT *
        FROM passport_achievements
        WHERE slug = $1
        LIMIT 1
        `,
        [achievementSlug],
      );

      const achievement = achievementResult.rows[0];

      if (achievement) {
        const unlockResult = await client.query(
          `
          INSERT INTO passport_achievement_unlocks (
            passport_id,
            achievement_id,
            progress
          )
          VALUES ($1, $2, 100)
          ON CONFLICT (passport_id, achievement_id) DO NOTHING
          RETURNING *
          `,
          [passport.id, achievement.id],
        );

        if (unlockResult.rows[0]) {
          unlockedAchievement = achievement;

          // Achievement XP is awarded only on first unlock.
          const achievementXp = Number(achievement.xp_reward || 0);

          if (achievementXp > 0) {
            const xpAfterAchievement = newXp + achievementXp;
            const levelAfterAchievement =
              Math.floor(xpAfterAchievement / 1000) + 1;

            await client.query(
              `
              UPDATE user_passports
              SET
                passport_xp = $1,
                passport_level = $2,
                updated_at = NOW()
              WHERE id = $3
              `,
              [xpAfterAchievement, levelAfterAchievement, passport.id],
            );
          }
        }
      }
    }

    await client.query("COMMIT");

    return {
      event: eventResult.rows[0],
      achievement: unlockedAchievement,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}