"use client";

import { Button } from "@/components/coss/button";
import type { OrgIndex } from "@/lib/org-view";
import { cn } from "@/lib/utils";
import { Maximize2Icon, Minimize2Icon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { OrgTreeNode, type NodeMark } from "./OrgTreeNode";

type Branches = {
  index: OrgIndex;
  collapsed: ReadonlySet<string>;
  markOf: (positionId: string) => NodeMark;
  query: string;
  hr: boolean;
  onToggle: (positionId: string) => void;
  onEdit?: (positionId: string) => void;
  onAssign: (positionId: string) => void;
};

/** Canvas padding on each side (px-4), so fit-to-screen leaves the same margin a scrolled chart has. */
const GUTTER = 16;
/** Below this the cards stop being readable; the chart scrolls instead of shrinking further. */
const MIN_SCALE = 0.3;

function Stem() {
  return <span aria-hidden="true" className="block h-5 w-[1.5px] shrink-0 bg-line-strong" />;
}

function Branch({ id, top, ctx }: { id: string; top: boolean; ctx: Branches }) {
  const seat = ctx.index.seats.get(id)!;
  const folded = ctx.collapsed.has(id);
  const reports = seat.reports;
  return (
    <div className="flex flex-col items-center">
      <OrgTreeNode
        seat={seat}
        top={top}
        folded={folded}
        onToggle={() => ctx.onToggle(id)}
        mark={ctx.markOf(id)}
        query={ctx.query}
        hr={ctx.hr}
        onEdit={ctx.onEdit}
        onAssign={ctx.onAssign}
      />
      {reports.length > 0 && !folded ? (
        <>
          <Stem />
          <ul aria-label={`Reports to ${seat.position.title}`} className="m-0 flex list-none items-start justify-center p-0">
            {reports.map((child, at) => (
              <li key={child} className="relative flex flex-col items-center px-3">
                {/* Each report draws its share of the bar, so the bar always ends on the outer stems whatever the card widths. */}
                {reports.length > 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-0 h-[1.5px] bg-line-strong",
                      at === 0 ? "right-0 left-1/2" : at === reports.length - 1 ? "right-1/2 left-0" : "inset-x-0",
                    )}
                  />
                ) : null}
                <Stem />
                <Branch id={child} top={false} ctx={ctx} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/**
 * The seat tree: top-down cards on stems and bars. Wider than the panel, it scrolls sideways, or
 * "Fit to screen" scales it down to the panel width (layout is untouched, so links and buttons still work).
 */
export function OrgTree({
  toolbar,
  focusId,
  ...ctx
}: Branches & {
  /** Controls for the start of the panel's toolbar row. */
  toolbar: ReactNode;
  /** A position to bring into view: the current search match, or one just created. */
  focusId: string | null;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const centered = useRef(false);
  const [fit, setFit] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number; room: number } | null>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    // offsetWidth ignores transforms, so this is the chart's natural size even while it is scaled.
    const measure = () =>
      setSize((before) => {
        const next = { width: content.offsetWidth, height: content.offsetHeight, room: scroller.clientWidth - GUTTER * 2 };
        return before && before.width === next.width && before.height === next.height && before.room === next.room ? before : next;
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const overflowing = size ? size.width > size.room + 1 : false;
  const scale = fit && size && overflowing ? Math.max(MIN_SCALE, size.room / size.width) : 1;

  // A chart wider than the panel opens on its middle, where the top position sits.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !size || centered.current) return;
    centered.current = true;
    scroller.scrollLeft = Math.max(0, (scroller.scrollWidth - scroller.clientWidth) / 2);
  }, [size]);

  useEffect(() => {
    if (!focusId) return;
    const node = scrollerRef.current?.querySelector<HTMLElement>(`[data-org-node="${CSS.escape(focusId)}"]`);
    if (!node) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "nearest", inline: "center" });
  }, [focusId, scale]);

  return (
    <section aria-label="Organization chart" className="overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">{toolbar}</div>
        {overflowing || fit ? (
          <div className="flex items-center gap-2">
            {scale < 1 ? (
              <span className="text-label font-normal text-muted tabular-nums" aria-live="polite">
                {Math.round(scale * 100)}%
              </span>
            ) : null}
            <Button type="button" variant="ghost" size="sm" aria-pressed={fit} onClick={() => setFit((value) => !value)}>
              {fit ? <Maximize2Icon aria-hidden="true" /> : <Minimize2Icon aria-hidden="true" />}
              {fit ? "Actual size" : "Fit to screen"}
            </Button>
          </div>
        ) : null}
      </div>
      <div
        ref={scrollerRef}
        tabIndex={0}
        role="region"
        aria-label="Chart canvas. Scroll sideways to see wider levels."
        className="overflow-x-auto bg-bg px-4 py-8 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <div
          className="mx-auto w-max"
          style={scale < 1 && size ? { width: size.width * scale, height: size.height * scale } : undefined}
        >
          <div
            ref={contentRef}
            className="w-max origin-top-left motion-safe:transition-transform motion-safe:duration-200"
            style={scale < 1 ? { transform: `scale(${scale})` } : undefined}
          >
            <ul aria-label="Top positions" className="m-0 flex list-none items-start gap-12 p-0">
              {ctx.index.roots.map((id) => (
                <li key={id}>
                  <Branch id={id} top ctx={ctx} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
