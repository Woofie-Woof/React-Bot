--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE Servers (
  id INTEGER PRIMARY KEY,
  name TEXT
);

CREATE TABLE Emojis (
  id          INTEGER PRIMARY KEY,
  serverId  INTEGER NOT NULL,
  name       TEXT    NOT NULL,
  imagePath TEXT NOT NULL,
  isGlobal NUMERIC NOT NULL DEFAULT 0,
  CONSTRAINT Emoji_fk_serverId FOREIGN KEY (serverId)
    REFERENCES Servers (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT Post_ck_isPublished CHECK (isGlobal IN (0, 1))
);

CREATE INDEX Emoji_ix_serverId ON Emojis (serverId);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP INDEX Emoji_ix_serverId;
DROP TABLE Emojis;
DROP TABLE Servers;