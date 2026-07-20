-- Usernames must never look like emails. The original platform_upgrade
-- migration backfilled username = email for pre-existing accounts; this
-- rewrites those to the sanitized local part (before "@"), so no UI surface
-- ever renders an email as an identity. New registrations always choose a
-- username explicitly — this only touches legacy rows.
--
-- Collision handling: first claimant (by id) keeps the clean local part iff
-- no other account already owns it; everyone else gets a stable 6-char
-- suffix derived from their id. The unique index on username is the final
-- safety net — a collision aborts the migration instead of corrupting data.

WITH candidates AS (
  SELECT
    id,
    -- lowercase local part, restricted to the allowed username charset,
    -- capped so a suffix always fits within the 32-char limit
    left(
      regexp_replace(lower(split_part(username, '@', 1)), '[^a-z0-9._-]', '', 'g'),
      25
    ) AS base
  FROM "User"
  WHERE username LIKE '%@%'
),
prepared AS (
  SELECT
    id,
    CASE
      WHEN length(coalesce(nullif(base, ''), 'user')) >= 3
        THEN coalesce(nullif(base, ''), 'user')
      ELSE rpad(coalesce(nullif(base, ''), 'user'), 3, '0')
    END AS candidate,
    row_number() OVER (
      PARTITION BY CASE
        WHEN length(coalesce(nullif(base, ''), 'user')) >= 3
          THEN coalesce(nullif(base, ''), 'user')
        ELSE rpad(coalesce(nullif(base, ''), 'user'), 3, '0')
      END
      ORDER BY id
    ) AS rn
  FROM candidates
)
UPDATE "User" u
SET username = CASE
  WHEN p.rn = 1
   AND NOT EXISTS (
     SELECT 1 FROM "User" x WHERE x.username = p.candidate AND x.id <> u.id
   )
  THEN p.candidate
  ELSE p.candidate || '_' || substr(md5(u.id), 1, 6)
END
FROM prepared p
WHERE p.id = u.id;
