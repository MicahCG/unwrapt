import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { PublicChrome, RelatedLinks, UpdatedLine } from "@/components/marketing/PublicChrome";
import { APP_ORIGIN, PUBLIC_CONTENT_UPDATED, PUBLIC_CONTENT_UPDATED_LABEL } from "@/seo/site";

const NeverForgetBirthdays = () => (
  <PublicChrome>
    <SEOHead
      title="How to stop forgetting birthdays"
      description="A practical way to stop missing birthdays: one list, a real date, a budget, and enough lead time for a shipped gift. Unwrapt is one way to keep that list."
      path="/guides/never-forget-birthdays"
      ogType="article"
    />
    <article className="mx-auto max-w-3xl px-6 py-16">
      <UpdatedLine date={PUBLIC_CONTENT_UPDATED} label={PUBLIC_CONTENT_UPDATED_LABEL} />
      <p className="mt-4 text-xs uppercase tracking-[0.25em] text-[#8B7355]">Guide</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight text-[#3D3428] md:text-5xl">
        How do I stop forgetting birthdays and buying gifts at the last minute?
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-[#3D3428]">
        Keep one list of people, put a real date next to each name, choose a budget before you shop, and start early enough that a shipped gift can still arrive. Last-minute gifts happen when the date lives in your head, or in three different apps, and you only notice it the week of the birthday.
      </p>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        You can do this with a notes app and a calendar reminder. Unwrapt is one product that keeps that list and can suggest a gift, but the system below works even if you never use it.
      </p>

      <h2 className="mt-12 font-serif text-3xl text-[#3D3428]">Why the date slips</h2>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        A birthday is easy to miss when it is not written down as a date you will actually see. Chat threads, old contacts, and a mental note from last year all fail the same way: nothing pings you while there is still time to choose. The fix is boring. One list, reviewed once, with the next date visible.
      </p>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        Write the year as well as the month and day when you can. &quot;March 3&quot; is enough to remind you. The year helps you notice a milestone, like a 40th birthday, instead of sending the same small gift you sent at 39 without thinking about it.
      </p>

      <h2 className="mt-12 font-serif text-3xl text-[#3D3428]">What to write down for each person</h2>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        Five lines are enough. You do not need a dossier.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-[#6B5D4D]">
        <li>Name, and how you know them.</li>
        <li>The date. Birthday, anniversary, or another day you intend to mark.</li>
        <li>Two or three interests, in their words if you have them. &quot;Drinks decaf&quot; is more useful than &quot;likes coffee.&quot;</li>
        <li>A budget you would actually spend, decided now, not in the checkout line.</li>
        <li>A street address, when you have one. If you do not, leave a blank and fill it before you buy anything that has to ship.</li>
      </ul>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        Keep the list where you will open it. A calendar event titled with the person&apos;s name, two weeks before the date, beats a beautiful spreadsheet you never open. If you already have dates in a calendar or address book, copy the ones you mean to keep. Do not import every contact. A list of twelve people you will really follow is better than eighty names you will ignore.
      </p>

      <h2 className="mt-12 font-serif text-3xl text-[#3D3428]">How much lead time a real gift needs</h2>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        If the gift is a physical object that has to be packed and shipped, same-day is the wrong plan. Give yourself at least two weeks before the date, and more in November and December, when carriers slow down. That window is for you to choose, pay, and still have ordinary shipping time left. It is not a guarantee that a particular order will arrive on the birthday.
      </p>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        Put the reminder on the day you need to decide, not on the birthday itself. A reminder that fires on the morning of the party only tells you that you are already late. A reminder fourteen days out still leaves room to change your mind.
      </p>

      <h2 className="mt-12 font-serif text-3xl text-[#3D3428]">Decide the money before you shop</h2>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        Pick a range while nothing is in a cart. A parent, a close friend, and a coworker do not need the same number, and writing it down stops the guilty upgrade that happens when you feel late. When you do look at a gift, compare it with the range you already chose. If it is over, skip it. The point of the system is that the birthday does not get to renegotiate your budget.
      </p>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        Look at three things before you pay: the item, the price, and the address. If any of the three is wrong, do not check out. A wrong ZIP code is harder to fix than waiting one more day to confirm it.
      </p>

      <h2 className="mt-12 font-serif text-3xl text-[#3D3428]">A short routine that survives a busy month</h2>
      <ol className="mt-4 list-decimal space-y-3 pl-5 leading-relaxed text-[#6B5D4D]">
        <li>Once, write the list. Include the next date for each person.</li>
        <li>Put a reminder two weeks before each date, on a calendar you already check.</li>
        <li>When it fires, open the list. Confirm the address and the budget. Then choose the gift.</li>
        <li>After it ships, note what you sent, so next year you do not repeat it by accident.</li>
        <li>When someone new matters, add them the day you think of them. Do not wait for their birthday to invent the system.</li>
      </ol>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        If you miss one, send the note anyway and move the gift, or skip the gift and keep the date for next year. A system that shames you for one miss gets deleted. A system that still has the date next year is the one that stops the pattern.
      </p>

      <h2 className="mt-12 font-serif text-3xl text-[#3D3428]">Using Unwrapt for the list</h2>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        Unwrapt stores the people, the dates, and a shipping address, then asks Thea to suggest a gift from the catalog fulfilled by Goody. By default you approve the purchase after you see the price. You can set a higher auto-approve limit later, but you do not have to. Shipping is in the United States, and a street address is required before anything is sent. VIP, the membership that opens the inbox, is $4.99 a month on the web. The gift is extra. None of that replaces the lead time above: a shipped gift still needs days, not the morning of the party.
      </p>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        Read{" "}
        <Link to="/how-it-works" className="text-[#3D3428] underline decoration-[#D2B887] underline-offset-4">
          how the service works
        </Link>{" "}
        and the{" "}
        <Link to="/pricing" className="text-[#3D3428] underline decoration-[#D2B887] underline-offset-4">
          pricing
        </Link>{" "}
        before you subscribe. If you would rather keep the list yourself, the routine on this page is complete without an account.
      </p>

      <p className="mt-10">
        <a
          href={APP_ORIGIN}
          className="inline-flex rounded-full border border-[#D2B887] bg-[#8B7355] px-6 py-3 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D3428]"
        >
          Continue at app.unwrapt.io
        </a>
      </p>
      <RelatedLinks
        links={[
          { href: "/how-it-works", label: "How Unwrapt sends a gift" },
          { href: "/pricing", label: "What the membership costs" },
          { href: "/faq", label: "Questions about delivery and approval" },
        ]}
      />
    </article>
  </PublicChrome>
);

export default NeverForgetBirthdays;
