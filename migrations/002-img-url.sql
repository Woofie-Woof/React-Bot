--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

ALTER TABLE Emojis ADD COLUMN imageUrl TEXT;

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

ALTER TABLE Emojis DROP COLUMN imageUrl;