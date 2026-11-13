import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SafeImage } from "@/components/ui/SafeImage";
import { PROPERTY_TYPE_LABELS } from "@/data/amenities";
import type { DirectoryStay } from "@/lib/api/directory";
import { formatAdminPrice } from "@/lib/price-format";
import { formatPrice, pluralize } from "@/lib/utils";
import type { Property, PropertyType } from "@/types/property";

export function propertyHref(slug: string) {
  return `/properties/${slug}`;
}

/** What a listing card shows: the same card for the hosts' real stays and the example stays. */
type Listing = {
  href: string;
  name: string;
  type: string | null;
  place: string;
  headline: string | null;
  bedrooms: number | null;
  maxGuests: number | null;
  /** Price already formatted ("₹12,500", "2,000.00 INR"), null: on request. */
  price: string | null;
  priceFrom?: boolean;
  unit: "night" | "day";
  photo: { src: string; alt: string } | null;
  rating?: { average: number; count: number };
};

/** Listing card. The title link is stretched over the whole card for a large hit area. */
function ListingCard({ listing, priority = false }: { listing: Listing; priority?: boolean }) {
  const typeLabel = listing.type ? (PROPERTY_TYPE_LABELS[listing.type as PropertyType] ?? listing.type) : null;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-card transition-shadow duration-(--duration-base) focus-within:focus-ring hover:shadow-panel">
      <div className="relative aspect-photo overflow-hidden bg-surface-muted">
        {listing.photo ? (
          <SafeImage
            src={listing.photo.src}
            alt={listing.photo.alt}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 380px, (min-width: 640px) 45vw, 100vw"
            className="object-cover transition-transform duration-500 ease-(--ease-standard) group-hover:scale-[1.03] motion-reduce:transform-none"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-muted">
            <Icon name="home" size={34} />
          </span>
        )}
        {typeLabel ? (
          <span className="absolute left-3 top-3 rounded-sm bg-primary-strong px-2 py-0.5 text-caption font-bold uppercase tracking-wide text-on-primary">
            {typeLabel}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-title text-heading">
            <Link href={listing.href} className="outline-none after:absolute after:inset-0 after:content-['']">
              {listing.name}
            </Link>
          </h3>
          {listing.rating ? (
            <p className="flex shrink-0 items-center gap-1 text-small font-semibold text-heading">
              <Icon name="star" size={14} className="text-rating" />
              {listing.rating.average.toFixed(2)}
              <span className="sr-only"> out of 5 from {listing.rating.count} reviews</span>
            </p>
          ) : null}
        </div>
        {listing.place ? (
          <p className="-mt-2 flex items-center gap-1.5 text-small text-body">
            <Icon name="mapPin" size={14} className="shrink-0" /> {listing.place}
          </p>
        ) : null}
        {listing.headline ? <p className="line-clamp-2 text-small text-body">{listing.headline}</p> : null}
        <ul className="flex flex-wrap gap-1.5 text-caption text-heading">
          {listing.bedrooms ? (
            <li className="flex items-center gap-1 rounded-sm bg-tag-bg px-2 py-1">
              <Icon name="bed" size={13} /> {pluralize(listing.bedrooms, "bedroom")}
            </li>
          ) : null}
          {listing.maxGuests ? (
            <li className="flex items-center gap-1 rounded-sm bg-tag-bg px-2 py-1">
              <Icon name="users" size={13} /> Sleeps {listing.maxGuests}
            </li>
          ) : null}
        </ul>
        <p className="mt-auto border-t border-divider pt-3 text-heading">
          {listing.price !== null ? (
            <>
              {listing.priceFrom ? <span className="text-small text-muted">From </span> : null}
              <span className="font-heading text-stat">{listing.price}</span>{" "}
              <span className="text-small text-muted">/ {listing.unit}</span>
            </>
          ) : (
            <span className="text-small font-semibold">Price on request</span>
          )}
        </p>
      </div>
    </article>
  );
}

/** Example stay of the website (src/data/properties.ts). */
export function PropertyCard({ property, priority = false }: { property: Property; priority?: boolean }) {
  const cover = property.images[0];
  return (
    <ListingCard
      priority={priority}
      listing={{
        href: propertyHref(property.slug),
        name: property.name,
        type: property.type,
        place: `${property.location.locality}, ${property.location.region}`,
        headline: property.headline,
        bedrooms: property.bedrooms,
        maxGuests: property.maxGuests,
        price: formatPrice(property.price.amount, property.price.currency),
        unit: "night",
        photo: cover ? { src: cover.src, alt: cover.alt } : null,
        rating: property.rating ? { average: property.rating.average, count: property.rating.count } : undefined,
      }}
    />
  );
}

/** A host's real property (pjActionGetDirectory): opens the host's own booking page (/<slug>). */
export function StayCard({ stay, priority = false }: { stay: DirectoryStay; priority?: boolean }) {
  return (
    <ListingCard
      priority={priority}
      listing={{
        href: `/${stay.slug}`,
        name: stay.name,
        type: stay.property_type,
        place: [stay.location.city, stay.location.state || stay.location.country].filter(Boolean).join(", "),
        headline: stay.headline,
        bedrooms: stay.bedrooms,
        maxGuests: stay.max_guests,
        price: stay.price !== null ? formatAdminPrice(stay.price, stay.currency_sign || stay.currency, stay.price_format, stay.currency) : null,
        priceFrom: stay.price_varies,
        unit: stay.price_based_on === "days" ? "day" : "night",
        photo: stay.photo ? { src: stay.photo, alt: stay.name } : null,
      }}
    />
  );
}
