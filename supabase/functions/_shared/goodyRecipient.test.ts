import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { goodyRecipientName } from "./goodyRecipient.ts";

Deno.test("a one-word name has no placeholder last name", () => {
  assertEquals(goodyRecipientName("Kora"), { first_name: "Kora" });
});

Deno.test("first and last name are split", () => {
  assertEquals(goodyRecipientName("Kora Lee"), { first_name: "Kora", last_name: "Lee" });
});

Deno.test("everything after the first word is the last name", () => {
  assertEquals(goodyRecipientName("  Mary  Jane  Watson "), { first_name: "Mary", last_name: "Jane Watson" });
});

Deno.test("an empty name falls back to Gift", () => {
  assertEquals(goodyRecipientName(""), { first_name: "Gift" });
  assertEquals(goodyRecipientName(null), { first_name: "Gift" });
});
