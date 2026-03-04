# Knowledge Graph Module --- API Spec

Base path: /api/v1/notes

------------------------------------------------------------------------

## Create Note

POST /notes

{ "title":"Startup Idea", "content":"Marketplace for services" }

------------------------------------------------------------------------

## List Notes

GET /notes

------------------------------------------------------------------------

## Get Note

GET /notes/:id

------------------------------------------------------------------------

## Update Note

PATCH /notes/:id

------------------------------------------------------------------------

## Delete Note

DELETE /notes/:id

------------------------------------------------------------------------

## Link Notes

POST /notes/:id/link

{ "targetNoteId":"uuid" }

------------------------------------------------------------------------

## List Backlinks

GET /notes/:id/backlinks

------------------------------------------------------------------------

## Create Block

POST /notes/:id/blocks

{ "content":"Important concept" }

------------------------------------------------------------------------

## Link Blocks

POST /blocks/:id/link

{ "targetBlockId":"uuid" }

------------------------------------------------------------------------

## Search Notes

GET /notes/search?q=keyword
