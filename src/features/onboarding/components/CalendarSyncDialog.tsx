"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { signupApi, type CalendarSyncState } from "@/lib/api/signup";

const PROVIDERS: Record<string, string> = {
  airbnb: "Airbnb",
  "booking.com": "Booking.com",
  vrbo: "Vrbo",
  homeaway: "HomeAway",
  tripadvisor: "Tripadvisor",
  other: "Calendar",
};

type Busy = null | "load" | "save" | "sync" | number;

/**
 * Two-way calendar sync with Airbnb (or Booking.com, Vrbo ...), as Properties > iCal feeds in the back office:
 *  1. Airbnb -> here: the listing's export link is saved and imported (and synchronised again automatically).
 *  2. Here -> Airbnb: this property's own calendar link is pasted into Airbnb's "Import calendar".
 */
export function CalendarSyncDialog({
  open,
  onClose,
  token,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  token: string | null;
  /** Number of connected calendar links (shown on the card). */
  onChange: (count: number) => void;
}) {
  const id = useId();
  const [state, setState] = useState<CalendarSyncState | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  /** Applies an answer of the back office. */
  function apply(result: Awaited<ReturnType<typeof signupApi.calendarSync>>) {
    if (!result.ok) {
      setError(result.errors.ical_url ?? "");
      if (!result.errors.ical_url) setMessage({ tone: "error", text: result.message });
      return false;
    }
    setState(result.data);
    onChange(result.data.feeds.length);
    if (result.data.import) {
      setMessage({ tone: result.data.import.status === "OK" ? "success" : "error", text: result.data.import.text });
    }
    return true;
  }

  // the saved links every time the dialog opens
  useEffect(() => {
    if (!open || !token) return;
    let live = true;
    void signupApi.calendarSync(token, { op: "get" }).then((result) => {
      if (live) apply(result);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when it opens
  }, [open, token]);

  async function run(next: Busy, request: Parameters<typeof signupApi.calendarSync>[1]) {
    if (!token || busy !== null) return false;
    setBusy(next);
    setError("");
    setMessage(null);
    const ok = apply(await signupApi.calendarSync(token, request));
    setBusy(null);
    return ok;
  }

  async function connect(event: FormEvent) {
    event.preventDefault();
    const value = url.trim();
    if (!/^https?:\/\/\S+$/i.test(value)) {
      setError("Paste the calendar (iCal) link of your listing, starting with https://");
      return;
    }
    if (await run("save", { op: "save", ical_url: value })) setUrl("");
  }

  async function copyExport() {
    if (!state?.export_url) return;
    try {
      await navigator.clipboard.writeText(state.export_url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage({ tone: "error", text: "Your browser blocked clipboard access — select the link and copy it manually." });
    }
  }

  const feeds = state?.feeds ?? [];
  const loading = token !== null && state === null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Sync your calendar"
      description="Connect Airbnb (or Booking.com, Vrbo) both ways so a date booked on one is blocked on the other."
      icon={<Icon name="calendar" size={20} />}
    >
      <div className="grid gap-6">
        {!token ? (
          <Notice tone="warning">Your session has ended. Please log in again to sync your calendar.</Notice>
        ) : null}

        {message ? (
          <Notice tone={message.tone === "success" ? "success" : "error"} role={message.tone === "error" ? "alert" : "status"}>
            {message.text}
          </Notice>
        ) : null}

        {/* 1. Airbnb -> here */}
        <section className="grid gap-3">
          <h3 className="font-heading text-base font-bold text-heading">1. Import your Airbnb calendar</h3>
          <p className="text-small text-body">
            On Airbnb open <strong>Listing › Availability › Connect calendars › Export calendar</strong>, copy the link and paste it here.
          </p>
          {state?.sync_allowed === false ? (
            <p role="status" className="rounded-input border border-border bg-surface px-3 py-2.5 text-small text-body">
              <Icon name="lock" size={14} className="mr-1 inline" /> Importing calendars (Airbnb / iCal sync) is not included in your plan.
              Upgrade your plan to keep your Airbnb bookings in sync.
            </p>
          ) : null}

          {feeds.length > 0 ? (
            <ul className="grid gap-2">
              {feeds.map((feed) => (
                <li key={feed.id} className="flex items-center gap-3 rounded-input border border-border bg-surface px-3 py-2.5">
                  <Icon name="check" size={16} className="shrink-0 text-success" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-small font-semibold text-heading">{PROVIDERS[feed.provider] ?? PROVIDERS.other}</span>
                    <span className="block truncate text-caption text-muted" title={feed.url}>{feed.url}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void run(feed.id, { op: "remove", feed_id: feed.id })}
                    disabled={busy !== null}
                    className="shrink-0 rounded-sm px-2 py-1 text-caption font-semibold text-error hover:underline disabled:opacity-50"
                  >
                    {busy === feed.id ? "Removing…" : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          ) : loading ? (
            <p className="text-small text-muted" role="status">Loading your calendars…</p>
          ) : null}

          <form onSubmit={connect} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" noValidate>
            <TextField
              id={`${id}-ical`}
              label={feeds.length > 0 ? "Add another calendar link" : "Calendar (iCal) link"}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://www.airbnb.com/calendar/ical/….ics"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setError("");
              }}
              error={error || undefined}
              disabled={!token}
            />
            <Button type="submit" disabled={!token || busy !== null || url.trim() === "" || state?.sync_allowed === false}>
              {busy === "save" ? "Importing…" : "Connect & import"}
            </Button>
          </form>

          {feeds.length > 0 ? (
            <div>
              <Button variant="outline" size="sm" onClick={() => void run("sync", { op: "sync" })} disabled={busy !== null}>
                <Icon name="refresh" size={15} className={busy === "sync" ? "animate-spin" : undefined} />
                {busy === "sync" ? "Syncing…" : "Sync now"}
              </Button>
              <p className="mt-2 text-caption text-muted">Links are also synchronised automatically.</p>
            </div>
          ) : null}
        </section>

        {/* 2. here -> Airbnb */}
        <section className="grid gap-3 border-t border-border pt-5">
          <h3 className="font-heading text-base font-bold text-heading">2. Block direct bookings on Airbnb</h3>
          <p className="text-small text-body">
            On Airbnb open <strong>Connect calendars › Import calendar</strong> and paste this link of your BookbyHost calendar.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={state?.export_url ?? ""}
              aria-label="Your BookbyHost calendar link"
              onFocus={(event) => event.currentTarget.select()}
              className="h-control min-w-0 flex-1 rounded-input border border-input-border bg-input-disabled px-4 text-small text-heading"
            />
            <Button variant="outline" onClick={() => void copyExport()} disabled={!state?.export_url}>
              <Icon name={copied ? "check" : "copy"} size={15} /> {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
