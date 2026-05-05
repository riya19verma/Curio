
--------------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------------

SELECT * FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';
--------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SELECT uuid_generate_v4();
--------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

--------------------------------------------------------------------------------------------
--1
--------------------------------------------------------------------------------------------

CREATE TABLE users(
	UID int primary key GENERATED ALWAYS AS IDENTITY,
	uname varchar(50) Not Null,
	username varchar(50) Unique Not Null,
	ph_no varchar(10),
	pass_hashed text Not Null,
	country varchar(20),
	refreshToken text,
	email text,
	google_id text,
	created_at timestamptz Not Null Default NOW(),
	avatar text
);
select* from users;

--------------------------------------------------------------------------------------------
--2
--------------------------------------------------------------------------------------------

CREATE TABLE user_preferences(
	UID int references users(UID),
	n_category varchar(20) Not Null,
	cat_score float,
	updated_at timestamptz Not Null,
	Primary Key(UID, n_category)
);
-------------------------
-- Trigger to update timestamp on updation of table
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-------------------------
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
---------------------------
select* from user_preferences;

--------------------------------------------------------------------------------------------
--3
--------------------------------------------------------------------------------------------

CREATE TABLE bookmarks(
	BID int primary key GENERATED ALWAYS AS IDENTITY,
	UID int Not Null references users(UID),
	NID UUID Not Null references news(NID),
	created_at timestamptz Not Null Default NOW(),
	Unique(NID, UID)
);
select* from bookmarks;

--------------------------------------------------------------------------------------------
--4
--------------------------------------------------------------------------------------------
CREATE TABLE user_clicks(
	CID UUID primary Key DEFAULT uuid_generate_v4(),
	UID int Not Null references users(UID),
	NID UUID Not Null references news(NID),
	clicked_at timestamptz Not Null Default NOW()
);
select* from user_clicks;

--------------------------------------------------------------------------------------------
--5
--------------------------------------------------------------------------------------------

CREATE TABLE user_embeddings(
	UID int primary key Not Null references users(UID),
	embed vector(384) Not Null
);
select* from user_embeddings;

--------------------------------------------------------------------------------------------
--6
--------------------------------------------------------------------------------------------

CREATE TABLE authors(
	AID int primary key GENERATED ALWAYS AS IDENTITY,
	a_name varchar(50) Not Null
);
select* from authors;
ALTER TABLE authors ADD CONSTRAINT authors_a_name_key UNIQUE (a_name);

--------------------------------------------------------------------------------------------
--7
--------------------------------------------------------------------------------------------

CREATE TABLE sources(
	SID int primary key GENERATED ALWAYS AS IDENTITY,
	s_name varchar(50) Not Null,
	domain_name text Not Null, --eg: bbc.com, nytimes.com, or reuters.com
	credibility_score float
);
select* from sources;
ALTER TABLE sources ADD CONSTRAINT sources_domain_name_key UNIQUE (domain_name);

--------------------------------------------------------------------------------------------
--8
--------------------------------------------------------------------------------------------

CREATE TABLE news(
	NID UUID primary Key DEFAULT uuid_generate_v4(),
	title text Not Null,
	description text Not Null,
	url text Unique Not Null,
	published_at timestamptz Not Null,
	SID int references sources(SID) Not Null,
	AID int references authors(AID) Not Null,
	created_at timestamptz Default NOW() Not Null
);
ALTER TABLE news
ADD COLUMN CatID int references categories(CatID)Not Null;
select* from news;
----------------------------------------
CREATE INDEX idx_news_published 
ON news(published_at DESC);
--------------------------
EXPLAIN ANALYZE
SELECT * FROM news
ORDER BY published_at DESC
LIMIT 10;

--------------------------------------------------------------------------------------------
--9
--------------------------------------------------------------------------------------------

CREATE TABLE news_embeddings(
	NID UUID primary key,
	embed vector(384) Not Null 
);
------------------------------
select* from news_embeddings;
------------------------------
CREATE INDEX ON news_embeddings
USING ivfflat (embed vector_cosine_ops)
WITH (lists = 100);

--------------------------------------------------------------------------------------------
--10
--------------------------------------------------------------------------------------------

CREATE TABLE highlights(
	HID int primary key GENERATED ALWAYS AS IDENTITY,
	NID UUID references news(NID) Not Null,
	priority int,
	expires_at timestamptz Not Null
);
select* from highlights;

--------------------------------------------------------------------------------------------
--11
--------------------------------------------------------------------------------------------

CREATE TABLE fake_score(
	NID UUID primary key references news(NID),
	clickbait_score float Not Null,
	f_score float Not Null
);
select* from fake_score;

--------------------------------------------------------------------------------------------
--12
--------------------------------------------------------------------------------------------

CREATE TABLE sync_changes(
	SyncID int primary key GENERATED ALWAYS AS IDENTITY,
	UID int Not Null references users(UID),
	obj_type char(3) Not Null, /* CID, UID */
	obj_id int Not Null,
	act char(6) Not Null, /* create, update, delete */
	ver int Default 1, /*version - updated monotonically for each user seperately*/
	created_at timetz Not Null
);
------------------------------------
CREATE OR REPLACE FUNCTION update_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ver = OLD.ver+1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--------------------------------------
CREATE TRIGGER set_version
BEFORE UPDATE ON sync_changes
FOR EACH ROW
EXECUTE FUNCTION update_version();
---------------------------------------
select* from sync_changes;

--------------------------------------------------------------------------------------------
--13
--------------------------------------------------------------------------------------------

CREATE TABLE user_recommendations(
	UID int Not Null,
	NID UUID Not Null,
	recommended_at timestamptz
);
select* from user_recommendations;

--------------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------------

CREATE TABLE categories(
	CatID int primary key GENERATED ALWAYS AS IDENTITY,
	cat_name varchar(30),
	car_embed vector(384)
);
ALTER TABLE categories
RENAME COLUMN car_embed to embeddings; 

select* from categories;
INSERT INTO categories (cat_name) VALUES
  ('World'), ('Technology'), ('Sports'), ('Business'),
  ('Science'), ('Entertainment'), ('Politics'), ('Environment');
--------------------------------------------------------------------------------------------
--------------------------------------------------------------------------------------------


