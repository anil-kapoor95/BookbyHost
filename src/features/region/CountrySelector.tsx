"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { COUNTRIES, findCountry, setCountry, useCountry } from "./country";

/** Countries shown first (the two currencies' main markets), then every country by name. */
const TOP = ["IN", "US"];

/**
 * Country picker: shows country names only (search by name or code). The country decides the currency of every
 * price on the website (India: INR, every other country: USD) without showing it here. Changing it changes the
 * country on the whole website, unless `onSelect` handles the choice itself.
 *   compact  header pill: flag + country name
 *   inline   "Prices for 🇮🇳 India" above the plan cards
 *   field    full-width field (checkout: billing country)
 */
export function CountrySelector({
  variant = "compact",
  value,
  onSelect,
  disabled,
  label = "Country",
  className,
  align = "right",
}: {
  variant?: "compact" | "inline" | "field";
  /** Country shown (default: the visitor's country). */
  value?: string;
  /** Instead of changing the site's country. */
  onSelect?: (code: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  align?: "left" | "right";
}) {
  const site = useCountry();
  const country = findCountry(value) ?? site.country;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = q
      ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q)
      : [...TOP.map((code) => findCountry(code)!), ...COUNTRIES.filter((c) => !TOP.includes(c.code))];
    return all;
  }, [query]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onDown = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function toggle() {
    if (disabled) return;
    setQuery("");
    setActive(0);
    setOpen((value) => !value);
  }

  function choose(code: string) {
    if (onSelect) onSelect(code);
    else setCountry(code);
    setOpen(false);
    button.current?.focus();
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (options[active]) choose(options[active].code);
    }
  }

  const trigger =
    variant === "compact" ? (
      <button
        ref={button}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${country.name}. Change`}
        className="flex h-9 items-center gap-1.5 rounded-pill border border-border bg-surface px-3 text-small font-semibold text-heading transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:focus-ring"
      >
        <span aria-hidden="true" className="text-[1.05rem] leading-none">
          {country.flag}
        </span>
        <span className="max-w-36 truncate">{country.name}</span>
        <Icon name="chevronDown" size={14} className={cn("text-muted transition-transform", open && "rotate-180")} />
      </button>
    ) : variant === "inline" ? (
      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-small text-body">
        <span>Prices for</span>
        <button
          ref={button}
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Prices for ${country.name}. Change country`}
          className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface py-1.5 pr-3 pl-2.5 font-semibold text-heading shadow-sm transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:focus-ring"
        >
          <span aria-hidden="true" className="text-[1.05rem] leading-none">
            {country.flag}
          </span>
          {country.name}
          <Icon name="chevronDown" size={14} className={cn("text-muted transition-transform", open && "rotate-180")} />
        </button>
      </p>
    ) : (
      <button
        ref={button}
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${country.name}. Change`}
        className="flex h-control w-full items-center gap-3 rounded-input border-[1.5px] border-input-border bg-input-bg px-4 text-left text-base text-heading transition-colors hover:border-input-border-hover focus-visible:outline-none focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden="true" className="text-[1.2rem] leading-none">
          {country.flag}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{country.name}</span>
        {!disabled ? (
          <Icon name="chevronDown" size={16} className="shrink-0 text-muted" />
        ) : (
          <Icon name="lock" size={14} className="shrink-0 text-muted" />
        )}
      </button>
    );

  return (
    <div ref={root} className={cn("relative", variant === "inline" && "flex justify-center", className)}>
      {trigger}
      {open ? (
        <div
          className={cn(
            "absolute top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-card border border-border bg-card p-2 text-left shadow-popover",
            variant === "field" ? "left-0 w-full" : align === "right" ? "right-0" : "left-0",
            variant === "inline" && "left-1/2 -translate-x-1/2",
          )}
          onKeyDown={onKey}
        >
          <label htmlFor={`${id}-search`} className="sr-only">
            Search countries
          </label>
          <div className="relative">
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
            />
            <input
              ref={search}
              id={`${id}-search`}
              type="search"
              autoComplete="off"
              placeholder="Search country"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              role="combobox"
              aria-expanded="true"
              aria-controls={`${id}-list`}
              aria-activedescendant={options[active] ? `${id}-${options[active].code}` : undefined}
              className="h-10 w-full rounded-input border border-input-border bg-input-bg pr-3 pl-9 text-small text-heading placeholder:text-placeholder focus-visible:outline-none focus-visible:focus-ring"
            />
          </div>
          <ul ref={list} id={`${id}-list`} role="listbox" aria-label={label} className="mt-2 max-h-72 overflow-y-auto">
            {options.length === 0 ? <li className="px-3 py-2 text-small text-muted">No country found.</li> : null}
            {options.map((c, index) => {
              const selected = c.code === country.code;
              return (
                <li
                  key={c.code}
                  id={`${id}-${c.code}`}
                  data-index={index}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(c.code)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-small",
                    index === active ? "bg-surface-sunken" : "",
                    !query && index === TOP.length - 1 && "mb-1 border-b border-divider pb-2.5",
                  )}
                >
                  <span aria-hidden="true" className="text-[1.05rem] leading-none">
                    {c.flag}
                  </span>
                  <span
                    className={cn("min-w-0 flex-1 truncate", selected ? "font-bold text-heading" : "text-body-strong")}
                  >
                    {c.name}
                  </span>
                  {selected ? <Icon name="check" size={14} className="shrink-0 text-primary" /> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
