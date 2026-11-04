import pool from "../pool.js";

export const insertRefreshToken = async (
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> => {
  // Prune this user's expired tokens so the table doesn't grow forever
  await pool.query(
    `DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at < NOW()`,
    [userId],
  );
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );
};

/**
 * Atomically deletes the token and returns its owner, so a refresh token can
 * only ever be used once even under concurrent requests.
 */
export const consumeRefreshToken = async (
  tokenHash: string,
): Promise<{ user_id: string; expires_at: Date } | null> => {
  const { rows } = await pool.query<{ user_id: string; expires_at: Date }>(
    `DELETE FROM refresh_tokens
     WHERE token_hash = $1
     RETURNING user_id, expires_at`,
    [tokenHash],
  );
  return rows[0] || null;
};

export const deleteRefreshToken = async (tokenHash: string): Promise<void> => {
  await pool.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [
    tokenHash,
  ]);
};
