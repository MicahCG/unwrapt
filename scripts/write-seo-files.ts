import { writeFileSync } from "node:fs";
import { renderRobots, renderSitemap } from "../src/seo/site";

writeFileSync("public/robots.txt", renderRobots());
writeFileSync("public/sitemap.xml", renderSitemap());
console.log("Wrote public/robots.txt and public/sitemap.xml");
