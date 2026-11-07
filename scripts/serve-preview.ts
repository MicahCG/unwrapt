import { fileURLToPath } from "node:url";
import { startStaticServer } from "../src/seo/staticServer";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const port = Number(process.env.PORT || 4178);
const started = await startStaticServer(dist, port);
console.log(`Unwrapt public preview at ${started.origin}`);
console.log("Send x-forwarded-host: www.unwrapt.io or open the host www.unwrapt.io.");
