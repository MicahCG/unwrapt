# Thea chat

Everything about how Thea talks and behaves lives in this folder. Change it here and nowhere else.

| To change | Edit |
| --- | --- |
| Her voice, attitude, humor, how she reads people, when she asks vs moves on | `THEA_GUIDE.md` |
| Safety boundaries, tools, reply formats the app parses (e.g. `RECOMMENDED_IDS`, the onboarding JSON) | `index.ts` |

`THEA_GUIDE.md` is not documentation: it's sent to the AI word for word on every message, in both the main chat and onboarding. Write it as instructions to Thea, and keep notes for humans in this README instead.

Changes take effect only after deploying from the `unwrapt` folder:

```sh
npx supabase functions deploy thea-chat
```

`supabase/config.toml` ships `THEA_GUIDE.md` with the function. If it's missing, the function fails at startup and the app falls back to short canned replies ("Got it. What else does … love?"), which is the sign to redeploy.

Notes:
- The onboarding chat (`mode: "onboarding"`) is open to any signed-in user; the main chat requires VIP.
- Gift picks come from the `gift-catalog` function, which turns Thea's gift directions (e.g. "Funny gifts") into catalog searches.
- Generated replies can't be fully covered by tests. Review her voice in real conversations after changing the guide.
