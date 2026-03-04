# Knowledge Graph Module --- Database Schema

Updated: 2026-03-04

------------------------------------------------------------------------

## notes

``` sql
CREATE TABLE notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,

 title text NOT NULL,
 content text,

 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now()
);
```

------------------------------------------------------------------------

## blocks

``` sql
CREATE TABLE blocks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 note_id uuid REFERENCES notes(id) ON DELETE CASCADE,

 content text,
 position integer
);
```

------------------------------------------------------------------------

## note_links

``` sql
CREATE TABLE note_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_note_id uuid REFERENCES notes(id),
 target_note_id uuid REFERENCES notes(id)
);
```

------------------------------------------------------------------------

## block_links

``` sql
CREATE TABLE block_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_block_id uuid REFERENCES blocks(id),
 target_block_id uuid REFERENCES blocks(id)
);
```

------------------------------------------------------------------------

## tags

``` sql
CREATE TABLE tags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 name text
);
```

------------------------------------------------------------------------

## note_tag_links

``` sql
CREATE TABLE note_tag_links (
 note_id uuid REFERENCES notes(id),
 tag_id uuid REFERENCES tags(id),
 PRIMARY KEY (note_id, tag_id)
);
```
