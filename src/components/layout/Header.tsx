import { mainNav } from "@/config/site";
import { CountrySelector } from "@/features/region/CountrySelector";
import { AuthNav } from "./AuthNav";
import { Logo } from "./Logo";
import { MobileNav, NavLinks } from "./Navigation";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-divider bg-header-bg">
      <div className="container-page flex h-header items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Main" className="hidden lg:block">
          <NavLinks items={mainNav} />
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          {/* country = currency of every price on the site (India: INR, elsewhere USD) */}
          <CountrySelector variant="compact" />
          <AuthNav variant="desktop" />
        </div>
        <MobileNav items={mainNav} />
      </div>
    </header>
  );
}
