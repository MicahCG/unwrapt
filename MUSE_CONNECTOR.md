# Muse Connector — setup

## What we built

- Edge function: `supabase/functions/muse-api`
- Docs: `https://app.unwrapt.io/muse/` (from `public/muse/`)
- OpenAPI: `https://app.unwrapt.io/muse/openapi.json`

## Supabase secrets to set

```bash
npx supabase secrets set \
  MUSE_CONNECTOR_KEY="generate-a-long-random-string" \
  MUSE_REVIEW_USER_ID="<uuid of a sandbox unwrapt user>" \
  --project-ref zxsswxzpzjimrrpcrrto
```

Also ensure `GOODY_API_KEY` / catalog products exist so `/v1/recommendations` returns priced gifts.

## Deploy

```bash
npx supabase functions deploy muse-api --project-ref zxsswxzpzjimrrpcrrto
```

Frontend docs ship with the normal Vercel/app deploy of `public/muse/*`.

## Meta form (Technical specs)

| Field | Value |
|-------|--------|
| Connection type | **Raw API** |
| API URL | `https://zxsswxzpzjimrrpcrrto.supabase.co/functions/v1/muse-api` |
| OpenAPI | `https://app.unwrapt.io/muse/openapi.json` |
| Docs | `https://app.unwrapt.io/muse/` |
| Auth | **API keys** (and note OAuth PKCE planned for consumer linking) |
