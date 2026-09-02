# Unwrapt × Expected Parrot — Pre-Launch Product Validation Brief

**Product:** Unwrapt (`unwrapt.io` marketing · `app.unwrapt.io` product)  
**Goal:** Have research agents experience the core product as different demographic personas, stress-test the early UX, and return a **structured conversion report** so we can refine before real users and paid acquisition.  
**Not the goal:** Perfect visual QA, edge-case engineering bugs, or rewriting the brand. Focus on **intent → activation → value → pay**.

---

## 0. Access (read this first)

Humans sign in with Google OAuth. **Agent testers must not use Google.** Use the private agent backdoor instead.

### Agent entry URL

```
https://app.unwrapt.io/agent-enter?key={{AGENT_ACCESS_KEY}}
```

Optional (if supported when you run):

```
https://app.unwrapt.io/agent-enter?key={{AGENT_ACCESS_KEY}}&persona={{persona_slug}}
```

What happens:

1. You receive a real sandbox session (email like `agent+{id}@testers.unwrapt.io`).
2. You land in the authenticated app (onboarding or inbox).
3. **Ask Thea** is enabled for tester accounts — use full chat, not keyword shortcuts.
4. Do **not** share the key or entry URL outside this study.

> **Ops note for Unwrapt team:** This brief assumes `/agent-enter` + `@testers.unwrapt.io` Thea allowlisting are live. If either is missing, pause the study — Google OAuth cannot be completed by agents.

### Environments

| URL | Use |
|-----|-----|
| `https://unwrapt.io` | Marketing / landing only — first impression, value prop, pricing |
| `https://app.unwrapt.io` | Product — onboarding, inbox, Thea, gifts, upgrade |

Start **half of personas on the landing page**, then enter via backdoor. Start the other half **directly in-app** via backdoor (simulates post-click / returning traffic). Compare which path feels clearer.

---

## 1. What Unwrapt is (product truth)

Unwrapt is an **automatic gifting concierge**.

- **Thea** is the gifting agent: remembers people and occasions, learns tastes, recommends gifts from a live catalog, and can help schedule / automate with approval.
- **Free plan:** up to **3 people**, manual scheduling, catalog, reminders.
- **VIP (~$4.99/mo):** unlimited people, automation, calendar sync, gift wallet, priority recommendations — **approve before anything ships**.
- You pay for **gifts when they ship**, not markups on a mystery fee. Subscription is for the concierge layer.

Core promise to pressure-test:

> “Never forget another moment — Thea remembers the people who matter and handles thoughtful gifts so you don’t stress.”

---

## 2. Study intent

Before ad spend and public launch, we need agents to answer:

1. **Is the value prop clear within 10–15 seconds** on landing and first in-app screens?
2. **Who is the strongest converting ICP** (and who should we *not* buy ads for yet)?
3. **Where does the early UX confuse, stall, or feel fake / untrustworthy?**
4. **When should upgrade / trial / “activate” intercepts appear** — too early, too late, or missing?
5. **Does Thea chat increase belief and intent to pay**, or is it a distraction?
6. **What must change before we spend money on traffic?** Ranked next steps for conversion.

---

## 3. Persona roster (run all)

Each agent run = **one persona**. Stay in character for the whole session. Do not average yourselves mid-flow.

| Slug | Persona | Demographics / situation | What “conversion” means to them |
|------|---------|---------------------------|----------------------------------|
| `busy_professional` | Alex, 34 | Dual-income, 50–60h work week, partner + parents + 2 friends they always forget | Would pay to stop last-minute Amazon guilt |
| `new_parent` | Jordan, 31 | New baby, sleep-deprived, birthday seasons feel impossible | Needs “set and forget” more than browsing |
| `long_distance` | Sam, 28 | Lives abroad / far from family; gifts are the main love language left | Cares about thoughtfulness + delivery reliability |
| `gift_anxious` | Riley, 26 | Overthinks gifts, hates being generic, budget-conscious | Needs taste + confidence, not automation first |
| `executive_assistant` | Casey, 38 | Buys gifts for a boss’s network / clients (B2B-ish use) | Needs volume, notes, professionalism |
| `skeptical_optimizer` | Morgan, 41 | Tried subscription boxes / “AI assistants”; assumes upsell traps | Will abandon at any fake trust or unclear pricing |
| `high_net_worth` | Avery, 45 | Happy to spend $150–400/gift; hates shopping time | VIP + autopilot should feel obvious |
| `gen_z_social` | Quinn, 22 | Remembers friends’ moments via IG; low willingness to pay monthly | Free tier must feel useful or they bounce |
| `caregiver` | Taylor, 52 | Aging parents + adult kids; many occasions/year | 3-person free cap is a conversion lever or a wall |
| `couple_planner` | Drew, 36 | Household ops owner; partner forgets everything | Shared mental load / “I’ll handle gifts” story |

**Minimum:** run all 10 once. Prefer **2 passes per ICP-looking persona** (`busy_professional`, `new_parent`, `caregiver`, `skeptical_optimizer`) if budget allows.

---

## 4. Session protocol (do this in order)

Budget **20–35 minutes** per persona. Narrate observations as you go (Expected Parrot transcript / notes). Mark timestamps for friction.

### Phase A — First impression (3–5 min)

1. Open `https://unwrapt.io` (unless assigned in-app-only).
2. Without scrolling the whole page: write the **one-sentence promise** you think the product makes.
3. Note: brand clarity, trust, confusion, “who is this for?”, pricing visibility.
4. Score **Landing clarity** 1–5 and **Intent to try** 1–5.

### Phase B — Enter product via backdoor (1 min)

1. Open the agent entry URL with the key.
2. Confirm you are authenticated (inbox or onboarding). Confirm **Ask Thea** opens real chat (not only “continue to catalog” routing).
3. If chat is keyword-only, **stop and flag ACCESS_FAILURE** — study invalid for Thea evaluation.

### Phase C — Onboarding (5–10 min)

Experience as a new user:

1. Welcome / intro → connect world or add someone manually.
2. Prefer **manual add** for at least half of runs (calendar OAuth may not work for agents). For personas who would connect Google Calendar, *role-play the expectation* and note whether the UI over-promises.
3. Add **2–3 people** with realistic names/dates/interests for your persona.
4. Complete intel / preferences / guardrails / finish setup.
5. Note every moment you wanted to quit, felt unsure, or felt delighted.

Capture:

- Time to “I get it”
- Time to first person saved
- Copy that felt dishonest (card capture, “AI”, unlimited claims, etc.)
- Whether free vs VIP was explained **before** you cared

### Phase D — Core product loop (8–12 min)

Do as many of these as the product allows:

| Action | Why |
|--------|-----|
| Open inbox / people list | Home-base comprehension |
| Ask Thea about one person (“gift ideas for Mom who loves gardening under $75”) | Agent value |
| Browse / narrow catalog if offered | Catalog trust |
| Schedule or start a gift for one occasion | Money path |
| Hit the **3-person free limit** (add a 4th if possible) | Upgrade intercept |
| Open upgrade / Activate / VIP surfaces | Pricing & paywall UX |
| Open Gift history / Settings briefly | Secondary IA |
| Trigger or notice any overlay, banner, trial chip, or “needs you” card | Intercept timing |

**Payment note:** Do **not** complete real card checkout unless explicitly instructed. Stop at the paywall / Stripe handoff and evaluate intent: *Would you continue? Why / why not?*

### Phase E — Intercept audit (2–3 min)

For every modal, banner, sheet, or upgrade prompt you saw, log:

| Intercept | When it appeared | Felt early / right / late? | Helped or hurt trust? | Better trigger would be… |
|-----------|------------------|----------------------------|------------------------|---------------------------|
| e.g. Activate Unwrapt banner | Empty inbox | Early | Hurt — I hadn’t felt value | After first gift recommendation |

We care especially about:

- Upgrade / VIP / Activate
- Monthly opportunities / daily overlays
- Thea dock / Ask Thea
- Free-tier blur / locked people
- Address / approval / automation prompts

### Phase F — Conversion judgment (3–5 min)

Still in persona, answer:

1. **Subscribe VIP now?** Yes / Maybe / No — probability 0–100%.
2. **Buy a gift through Unwrapt in 30 days?** Yes / Maybe / No — probability 0–100%.
3. **What single change would most raise those probabilities?**
4. **Would you recommend to a friend like you?** NPS-style −100 to 100.

---

## 5. Features to explicitly test

Mark each: `worked` / `confused` / `broken` / `skipped`.

- [ ] Landing → understood offer  
- [ ] Agent backdoor login  
- [ ] Onboarding (manual person path)  
- [ ] Interest / “getting to know them” step  
- [ ] Budget / approval guardrails  
- [ ] Inbox empty & populated states  
- [ ] Ask Thea (real multi-turn chat + gift suggestions)  
- [ ] Catalog / gift ideas  
- [ ] Schedule gift / gift flow (to paywall)  
- [ ] Free 3-person limit & upgrade CTA  
- [ ] VIP value explanation ($4.99 vs gift cost clarity)  
- [ ] Settings / preferences glance  
- [ ] Gift history glance  
- [ ] Any automation / wallet messaging (even if VIP-gated)

---

## 6. Demographic & ICP synthesis rules

After individual runs, synthesize across personas:

1. **Primary ICP (launch ads here):** highest combo of (clarity × delight × pay intent × gift intent).
2. **Secondary ICP:** strong interest, needs one product fix before ads.
3. **Do-not-buy-yet:** low intent or mismatched promise (e.g. wants marketplace, not concierge).
4. **Segment-specific copy hooks** (1 line each) for ads / landing hero.
5. **Gender / age / life-stage patterns** only if clearly evidenced in runs — no stereotyping beyond observed behavior.

---

## 7. Required deliverable — structured report

Return **one report** with these exact sections. Be blunt. Prefer evidence from sessions over generic startup advice.

### A. Executive verdict (½ page)

- Launch-ready for paid traffic? **Yes / Not yet / Only for segment X**
- Top 3 reasons
- Predicted conversion bottleneck #1

### B. ICP ranking

Table:

| Rank | Persona slug | Try intent | VIP subscribe P() | Gift purchase P() | Why |
|------|--------------|------------|-------------------|-------------------|-----|

Name the **core launch audience** in one sentence.

### C. Value prop scorecard

| Claim | Believed? | Evidence | Fix |
|-------|-----------|----------|-----|
| Never forget moments | | | |
| Thea as trusted concierge | | | |
| Free useful without VIP | | | |
| $4.99 VIP worth it | | | |
| Approve-before-ship trust | | | |
| Pay only for real gifts | | | |

### D. Early UX journey map

Step-by-step: Landing → Auth → Onboarding → Inbox → Thea → Gift → Paywall  

For each step: **what worked**, **friction**, **drop-off risk (H/M/L)**.

### E. Intercept recommendations

For each major intercept: keep / move / rewrite / delete.  
Propose the **ideal first upgrade moment** (event-based, not time-based if possible).

### F. Thea agent evaluation

- Did chat increase willingness to pay?
- Where Thea felt magical vs scripted vs blocked
- Suggested first-message prompts to surface in UI
- Trust / safety / overpromise issues

### G. Conversion killers (ordered)

Numbered list of the highest-impact problems only (max 8).

### H. What to change before ad spend

**P0 (must ship before paid traffic)**  
**P1 (ship in first week of soft launch)**  
**P2 (nice after learning from real users)**  

Each item: change → expected conversion effect → how to measure.

### I. Messaging & creative implications

- 3 landing headline alternatives that matched high-intent personas  
- 3 ad angles tied to ICPs  
- Words/phrases to avoid (hype, fake AI, unclear fees)

### J. Next steps for product designers (checklist)

Actionable checklist for the next 1–2 weeks of UX work, ordered by conversion leverage. Include owners as `Design` / `Product` / `Eng` only (no names).

### K. Appendix — session logs

Per persona: slug, path (landing-first vs app-first), key quotes, scores, bugs, screenshots or step list if available.

---

## 8. Scoring rubric (use consistently)

| Score | Meaning |
|-------|---------|
| 1 | Confusing or trust-breaking; would leave |
| 2 | Weak; would only continue if bored |
| 3 | Acceptable; lukewarm intent |
| 4 | Clear value; likely to try / maybe pay |
| 5 | Strong; would subscribe or buy soon |

Always score:

- Landing clarity  
- Onboarding ease  
- Time-to-value  
- Thea usefulness  
- Upgrade fairness  
- Overall subscribe intent  
- Overall gift-purchase intent  

---

## 9. Guardrails for agents

- Stay in persona; do not “help the startup” by being overly polite.
- Prefer **specific UI moments** (“on the guardrails screen, full autopilot badge said VIP but I didn’t know price”) over vague “onboarding is long.”
- Do not invent features that aren’t in the product.
- Do not complete real payments unless told.
- If blocked by Google OAuth, CAPTCHA, or Thea keyword-only mode → log `ACCESS_FAILURE` and stop that path.
- Calendar connect may fail for agents — use manual add and note the gap.
- Separate **product feedback** from **infrastructure feedback**.

---

## 10. Success criteria for this study

The study succeeds if Unwrapt leaves with:

1. A named **primary ICP** for first ad spend  
2. A **P0 change list** that would materially raise subscribe/gift intent  
3. A clear call on **when the upgrade intercept should fire**  
4. A yes/no on whether **Thea chat is conversion-positive** for that ICP  
5. Confidence to either **spend** or **wait** — with reasons

---

## 11. One-line brief for the agent system prompt

> You are a demographic research persona testing Unwrapt before launch. Enter via the agent backdoor (not Google). Complete onboarding and the core gift loop, chat with Thea, pressure-test upgrade intercepts, and produce the structured conversion report in section 7 — blunt, evidence-based, optimized for what to fix before paid traffic.

---

## 12. Unwrapt team checklist (before kicking off Expected Parrot)

- [ ] `/agent-enter` live on `app.unwrapt.io` with rotatable `AGENT_ACCESS_KEY`
- [ ] Tester emails `@testers.unwrapt.io` allowed for Thea LLM (client + `thea-chat` / `THEA_ALLOWED_EMAILS`)
- [ ] Key shared only through Expected Parrot secure config (not in public docs)
- [ ] Seed catalog has enough active products for Thea recommendations
- [ ] Confirm free tier still caps at 3 recipients (needed for upgrade tests)
- [ ] Analytics/events not polluted — agent users tagged `is_agent_tester` if available
- [ ] Assign this markdown as the Expected Parrot study instructions

---

*Document owner: Unwrapt product. Audience: Expected Parrot research agents + human facilitators. Purpose: pre-launch conversion validation, not production support.*
