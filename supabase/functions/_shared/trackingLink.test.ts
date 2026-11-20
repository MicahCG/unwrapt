import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { trackingUrl } from "./trackingLink.ts";

Deno.test("UPS 1Z numbers link to UPS", () => {
  assertEquals(trackingUrl("1Z3K44G30320311021"), "https://www.ups.com/track?tracknum=1Z3K44G30320311021");
  assertEquals(trackingUrl(" 1z3k44g30320311021 "), "https://www.ups.com/track?tracknum=1Z3K44G30320311021");
});

Deno.test("USPS and FedEx formats", () => {
  assertEquals(trackingUrl("9400111899223197428490").startsWith("https://tools.usps.com/"), true);
  assertEquals(trackingUrl("123456789012").startsWith("https://www.fedex.com/"), true);
});

Deno.test("unknown formats use a universal tracker and are URL-encoded", () => {
  assertEquals(trackingUrl("ab 12/3"), "https://parcelsapp.com/en/tracking/AB12%2F3");
});
