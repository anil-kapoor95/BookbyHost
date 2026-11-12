import { MarketingIcon, type MarketingIconName } from "@/components/marketing/icons";
import { getSocialLinks, type SocialNetwork } from "@/lib/api/social";
import { cn } from "@/lib/utils";

const NETWORKS: Record<SocialNetwork, { label: string; icon: MarketingIconName }> = {
  instagram: { label: "Instagram", icon: "instagram" },
  facebook: { label: "Facebook", icon: "facebook" },
  linkedin: { label: "LinkedIn", icon: "linkedin" },
  x: { label: "X", icon: "xLogo" },
  youtube: { label: "YouTube", icon: "youtube" },
};

/**
 * Social icons with the links of the back office (System Options > Visual & Branding). Only the networks that
 * have a link are shown; nothing at all when none is set. Use it anywhere: <SocialLinks /> or <SocialLinks tone="dark" />.
 */
export async function SocialLinks({
  tone = "light",
  className,
  title,
}: {
  /** light: white tiles (light backgrounds); dark: for the footer. */
  tone?: "light" | "dark";
  className?: string;
  /** Optional heading above the icons (only shown when there are links). */
  title?: React.ReactNode;
}) {
  const links = await getSocialLinks();
  if (links.length === 0) return null;
  return (
    <div className={className}>
      {title}
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => {
          const network = NETWORKS[link.network];
          if (!network) return null;
          return (
            <li key={link.network}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                title={network.label}
                className={cn(
                  "grid size-10 place-items-center rounded-input transition-colors focus-visible:outline-none focus-visible:focus-ring",
                  tone === "light"
                    ? "bg-surface text-heading shadow-card hover:text-primary-strong"
                    : "border border-footer-divider text-footer-text hover:border-white/40 hover:text-on-dark",
                )}
              >
                <MarketingIcon name={network.icon} size={18} />
                <span className="sr-only">{network.label} (opens in a new tab)</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
