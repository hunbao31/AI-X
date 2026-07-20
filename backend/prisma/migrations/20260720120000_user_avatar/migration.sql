-- Profile avatars: a preset id per user (no uploads). Additive; every
-- existing account starts on the default Koaly.

ALTER TABLE "User" ADD COLUMN "avatar" TEXT NOT NULL DEFAULT 'koaly_default';
