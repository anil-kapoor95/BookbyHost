import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HostSite } from "@/components/layout/HostSite";
import { Icon } from "@/components/ui/Icon";
import { AMENITIES } from "@/data/amenities";
import { DEFAULT_SITE_LABELS } from "@/features/property-page/default-labels";
import { PropertyWebsite } from "@/features/property-page/PropertyWebsite";
import type { PropertyPageData } from "@/lib/api/property-page";
import { propertyRepository } from "@/lib/properties/repository";
import { currencySymbol } from "@/lib/price-format";
import { pageMetadata, truncate } from "@/lib/seo";
import type { Property, ThemeId } from "@/types/property";

export async function generateStaticParams() {
  const slugs = await propertyRepository.listSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/properties/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const property = await propertyRepository.getBySlug(slug);
  if (!property) return { title: "Property not found", robots: { index: false } };
  const cover = property.images[0];
  return pageMetadata({
    title: `${property.name} — ${property.summary} in ${property.location.locality} (example)`,
    description: truncate(`${property.headline}. ${property.description}`),
    path: `/properties/${property.slug}`,
    images: cover ? [{ url: cover.src, width: cover.width, height: cover.height, alt: cover.alt }] : undefined,
  });
}

/** Colours of the example themes (the back office's colour themes: Pine, Charcoal, Terracotta, Slate Blue, Harbor). */
const EXAMPLE_COLORS: Record<ThemeId, NonNullable<PropertyPageData["theme"]>["colors"]> = {
  casa: { brand: "#1f5f4e", accent: "#e0872c", text: "#1b2621", background: "#ffffff", price: "#1f5f4e", page_background: "#f6f4ef" },
  luxe: { brand: "#2b3440", accent: "#c99a3f", text: "#171b20", background: "#ffffff", price: "#2b3440", page_background: "#f2f4f6" },
  homestay: { brand: "#b0542a", accent: "#2f7d64", text: "#241611", background: "#ffffff", price: "#b0542a", page_background: "#f8f2ec" },
  urban: { brand: "#33506e", accent: "#c96b4a", text: "#172230", background: "#ffffff", price: "#33506e", page_background: "#eef2f6" },
  coastal: { brand: "#155e75", accent: "#e08a3c", text: "#16242b", background: "#ffffff", price: "#155e75", page_background: "#eef4f6" },
};

const amenityLabel = new Map(AMENITIES.map((amenity) => [amenity.id, amenity.label]));

/** An example stay in the shape of a host's real page, so it is shown with the same design. */
function toPageData(property: Property): PropertyPageData {
  return {
    slug: property.slug,
    name: property.name,
    property_type: property.type,
    headline: property.headline,
    description: [property.description, property.highlights.length ? property.highlights.join(" · ") : ""].filter(Boolean).join("\n\n"),
    faqs: property.faqs,
    location: { city: property.location.locality, state: property.location.region, country: property.location.country, lat: null, lng: null },
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    max_guests: property.maxGuests,
    amenities: property.amenities.map((id) => amenityLabel.get(id) ?? id),
    price: property.price.amount,
    price_varies: false,
    price_based_on: "nights",
    currency: property.price.currency,
    currency_sign: currencySymbol(property.price.currency),
    price_format: { price_format: 3, currency_place: "front" },
    photos: property.images.map((image) => ({ url: image.src, thumb_url: image.src })),
    host: { name: property.host.name, logo: null, phone: "", email: "" },
    theme: { id: property.theme, name: property.theme, colors: EXAMPLE_COLORS[property.theme] },
    branding: false,
    booked: property.availability.booked.map((range) => ({ from: range.from, to: range.to })),
    booking_url: "",
    labels: DEFAULT_SITE_LABELS as PropertyPageData["labels"],
    guests: { adults: { show: true, max: property.maxGuests }, children: { show: true, max: Math.max(0, property.maxGuests - 1) } },
  };
}

/** Example stay of the website: the same design as a host's own page, with a note that it can't be booked. */
export default async function ExamplePropertyPage({ params }: PageProps<"/properties/[slug]">) {
  const { slug } = await params;
  const property = await propertyRepository.getBySlug(slug);
  if (!property) notFound();

  return (
    <>
      <HostSite />
      <div role="note" className="bg-secondary text-on-secondary">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 text-small sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-center gap-2">
            <Icon name="info" size={16} className="shrink-0" />
            This is an example page showing a StayOwned design. It can&apos;t be booked.
          </p>
          <span className="flex shrink-0 items-center gap-4">
            <Link href="/properties" className="font-semibold underline underline-offset-2 hover:no-underline">
              See real stays
            </Link>
            <Link href="/setup/account" className="font-semibold underline underline-offset-2 hover:no-underline">
              Create your page
            </Link>
          </span>
        </div>
      </div>
      <PropertyWebsite page={toPageData(property)} basePath={`/properties/${property.slug}`} companyHref={null} demo />
    </>
  );
}
