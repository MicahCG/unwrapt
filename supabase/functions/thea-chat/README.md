# Thea chat

Everything about how Thea talks and behaves lives in this folder. Change it here and nowhere else.

| To change | Edit |
| --- | --- |
| Who she is everywhere: voice, attitude, humor, how she reads people, gift directions | `THEA_GUIDE.md` |
| The setup chat ("Getting to know Aunty"): staying on the gift, witty redirects, when to ask vs move on | `THEA_GUIDE_ONBOARDING.md` |
| The main chat in the app: what she'll talk about, how she gets to a recommendation | `THEA_GUIDE_CHAT.md` |
| Safety boundaries, tools, reply formats the app parses (e.g. `RECOMMENDED_IDS`, the onboarding JSON) | `index.ts` |

The guides are not documentation: they're sent to the AI word for word. Every message gets `THEA_GUIDE.md` plus the guide for that conversation, and the conversation guide wins where they differ. Write them as instructions to Thea, and keep notes for humans in this README instead. If something applies everywhere, put it in `THEA_GUIDE.md` once rather than in both conversation guides.

Changes take effect only after deploying from the `unwrapt` folder:

```sh
npx supabase functions deploy thea-chat
```

`supabase/config.toml` ships the guides with the function (add any new guide file there too). If one is missing, the function fails at startup and the app falls back to short canned replies ("Got it. What else does … love?"), which is the sign to redeploy.

Notes:
- The onboarding chat (`mode: "onboarding"`) is open to any signed-in user; the main chat requires VIP.
- Gift picks come from the `gift-catalog` function, which turns Thea's gift directions (e.g. "Funny gifts") into catalog searches.
- Generated replies can't be fully covered by tests. Review her voice in real conversations after changing the guide.
