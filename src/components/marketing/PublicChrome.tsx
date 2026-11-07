import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import { APP_ORIGIN, PRIMARY_NAV } from "@/seo/site";

const linkClass =
  "rounded-sm text-sm tracking-wide text-[#6B5D4D] underline-offset-4 hover:text-[#3D3428] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8B7355]";

export function PublicFooter() {
  return (
    <footer className="px-6 py-16" style={{ borderTop: "1px solid #E8DCC8", backgroundColor: "#F3EDE4" }}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8">
        <Logo size="md" />
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm">
          {PRIMARY_NAV.map((item) => (
            <Link key={item.href} to={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
          <Link to="/privacy" className={linkClass}>
            Privacy
          </Link>
          <Link to="/terms" className={linkClass}>
            Terms
          </Link>
          <a href="mailto:support@unwrapt.io" className={linkClass}>
            Contact
          </a>
        </nav>
        <p className="text-center text-xs text-[#6B5D4D]">
          © 2026 Unwrapt. Operated by KinGira LLC in Texas. Gifts ship in the United States.
        </p>
      </div>
    </footer>
  );
}

export function PublicNav({ overlay = false }: { overlay?: boolean }) {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const solid = !overlay || scrolled;

  return (
    <div
      className={`border-b backdrop-blur-xl transition-colors duration-500 ${
        solid ? "border-[#E8DCC8] bg-white/85" : "border-transparent bg-[#F8F1E6]/80"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link to="/" className="rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8B7355]">
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <ul className="hidden items-center gap-6 lg:flex">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={linkClass}
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <details className="relative lg:hidden">
            <summary className="cursor-pointer list-none rounded-full border border-[#D2B887] px-3 py-2 text-sm text-[#3D3428] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B7355] [&::-webkit-details-marker]:hidden">
              Menu
            </summary>
            <ul className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-[#E8DCC8] bg-[#FFFBF5] p-3 shadow-lg">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className="block rounded-lg px-3 py-2 text-sm text-[#3D3428] hover:bg-[#F3EDE4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8B7355]"
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
          <a
            href={APP_ORIGIN}
            className="rounded-full bg-[#8B7355] px-4 py-2.5 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D3428] sm:px-6"
          >
            Get started
          </a>
        </div>
      </div>
    </div>
  );
}

export function PublicChrome({
  children,
  overlay = false,
}: {
  children: ReactNode;
  overlay?: boolean;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F1E6", color: "#3D3428" }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-[#3D3428]"
      >
        Skip to content
      </a>
      <header className={overlay ? "fixed left-0 right-0 top-0 z-50" : "sticky top-0 z-40"}>
        <PublicNav overlay={overlay} />
      </header>
      <main id="main">{children}</main>
      <PublicFooter />
    </div>
  );
}

export function UpdatedLine({ date, label }: { date: string; label: string }) {
  return (
    <p className="text-sm text-[#6B5D4D]">
      Updated <time dateTime={date}>{label}</time>
    </p>
  );
}

export function RelatedLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <nav aria-label="Related" className="mt-12 border-t border-[#E8DCC8] pt-8">
      <h2 className="font-serif text-2xl text-[#3D3428]">Related</h2>
      <ul className="mt-4 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link to={link.href} className="text-[#3D3428] underline decoration-[#D2B887] underline-offset-4">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
