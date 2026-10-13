import { currentAssignments, isHrLike, itemsForSet, kpiSetForAssignment } from "./domain";
import {
  activeKpiYear,
  adminIsRemainingApproverForKpiSet,
  effectiveCheckInStatus,
  hasAdminGrant,
  isPortfolioDualApproved,
  kpiYearPhase,
  lineManagerPersonIdForKpiSet,
} from "./domain-query";
import { lateCheckInCount, needsCheckInThisWindow } from "./phase-desk";
import type { AppState } from "./types";

/** "act": the viewer must do something. "wait": the viewer's own work is with someone else. */
export type NeedsYouTone = "act" | "wait";

export type NeedsYouItem = {
  id: string;
  /** Which hat the viewer wears for this item. */
  hat: "self" | "line-manager" | "admin" | "hr";
  tone: NeedsYouTone;
  count: number;
  /** A full sentence, count included. */
  title: string;
  href: string;
  action: string;
};

function plural(count: number, one: string, many = `${one}s`) {
  return count === 1 ? one : many;
}

/**
 * Work waiting on the signed-in User, by role (ADR-0009). Counts only what the viewer can act on,
 * plus their own KPI Portfolio when it is waiting on someone else.
 */
export function needsYou(state: AppState, today: string): NeedsYouItem[] {
  const me = state.currentPersonId;
  const items: NeedsYouItem[] = [];
  const year = activeKpiYear(state);
  const phase = year ? kpiYearPhase(year) : null;
  const admin = hasAdminGrant(state);

  if (year && (phase === "planning" || phase === "monitoring")) {
    for (const assignment of currentAssignments(state, me)) {
      const kpiSet = kpiSetForAssignment(state, assignment.id, year.id);
      if (!kpiSet || kpiSet.status === "draft") {
        items.push({
          id: `plan-${assignment.id}`,
          hat: "self",
          tone: "act",
          count: 1,
          title: "Plan your KPI Portfolio and submit it for approval",
          href: "/kpi",
          action: "Open My KPI",
        });
      } else if (kpiSet.status === "returned") {
        items.push({
          id: `returned-${kpiSet.id}`,
          hat: "self",
          tone: "act",
          count: 1,
          title: "Your KPI Portfolio was returned for changes",
          href: "/kpi",
          action: "See what to change",
        });
      } else if (!isPortfolioDualApproved(state, kpiSet.id)) {
        items.push({
          id: `waiting-${kpiSet.id}`,
          hat: "self",
          tone: "wait",
          count: 1,
          title: "Your KPI Portfolio is waiting for approval",
          href: "/kpi",
          action: "View status",
        });
      } else if (phase === "monitoring") {
        const due = itemsForSet(state, kpiSet.id).filter((item) => needsCheckInThisWindow(state, year, item, today)).length;
        if (due > 0) {
          items.push({
            id: `checkin-${kpiSet.id}`,
            hat: "self",
            tone: "act",
            count: due,
            title: `${due} ${plural(due, "KPI Check-In")} due this period`,
            href: "/kpi",
            action: "Check in",
          });
        }
      }
    }

    const yearSets = state.kpiSets.filter((row) => row.cycleId === year.id);
    const pendingCheckIns = state.checkIns.filter((row) => effectiveCheckInStatus(row) === "pending");
    const setOfCheckIn = (kpiItemId: string) => state.kpiItems.find((item) => item.id === kpiItemId)?.kpiSetId;

    const lmSets = yearSets.filter(
      (row) =>
        lineManagerPersonIdForKpiSet(state, row.id) === me && !adminIsRemainingApproverForKpiSet(state, row.id),
    );
    const lmSetIds = new Set(lmSets.map((row) => row.id));
    const lmPortfolios = lmSets.filter((row) => row.status === "pending" && !row.lineManagerApprovedBy).length;
    const lmCheckIns = pendingCheckIns.filter((row) => {
      const setId = setOfCheckIn(row.kpiItemId);
      return setId !== undefined && lmSetIds.has(setId) && !row.lineManagerApprovedBy;
    }).length;
    if (lmPortfolios > 0) {
      items.push({
        id: "lm-portfolios",
        hat: "line-manager",
        tone: "act",
        count: lmPortfolios,
        title: `${lmPortfolios} ${plural(lmPortfolios, "KPI Portfolio")} to approve for your team`,
        href: "/kpi/team",
        action: "Review",
      });
    }
    if (lmCheckIns > 0) {
      items.push({
        id: "lm-checkins",
        hat: "line-manager",
        tone: "act",
        count: lmCheckIns,
        title: `${lmCheckIns} ${plural(lmCheckIns, "KPI Check-In")} to approve for your team`,
        href: "/kpi/team",
        action: "Review",
      });
    }

    if (admin) {
      const adminPortfolios = yearSets.filter((row) => row.status === "pending" && !row.adminApprovedBy).length;
      const adminCheckIns = pendingCheckIns.filter((row) => {
        const setId = setOfCheckIn(row.kpiItemId);
        return setId !== undefined && yearSets.some((set) => set.id === setId) && !row.adminApprovedBy;
      }).length;
      const missing = state.assignments.filter(
        (row) => row.endDate === null && !kpiSetForAssignment(state, row.id, year.id),
      ).length;
      const late = lateCheckInCount(state, today);
      if (adminPortfolios + adminCheckIns > 0) {
        const parts = [
          adminPortfolios > 0 ? `${adminPortfolios} ${plural(adminPortfolios, "KPI Portfolio")}` : null,
          adminCheckIns > 0 ? `${adminCheckIns} ${plural(adminCheckIns, "KPI Check-In")}` : null,
        ].filter(Boolean);
        items.push({
          id: "admin-approvals",
          hat: "admin",
          tone: "act",
          count: adminPortfolios + adminCheckIns,
          title: `Waiting for Admin approval: ${parts.join(" and ")}`,
          href: "/kpi/cycle",
          action: "Open KPI Admin",
        });
      }
      if (missing > 0) {
        items.push({
          id: "admin-missing",
          hat: "admin",
          tone: "act",
          count: missing,
          title: `${missing} ${missing === 1 ? "person has" : "people have"} no KPI Portfolio this year`,
          href: "/kpi/cycle",
          action: "Create portfolios",
        });
      }
      if (late > 0) {
        items.push({
          id: "admin-late",
          hat: "admin",
          tone: "act",
          count: late,
          title: `${late} late ${plural(late, "KPI Check-In")} across the company`,
          href: "/kpi/cycle",
          action: "See who",
        });
      }
    }
  }

  if (admin) {
    const leave = state.leaveRequests.filter((row) => row.decision === null).length;
    if (leave > 0) {
      items.push({
        id: "admin-leave",
        hat: "admin",
        tone: "act",
        count: leave,
        title: `${leave} leave ${plural(leave, "request")} to decide`,
        href: "/leave/decide",
        action: "Decide",
      });
    }
  }

  if (isHrLike(state.currentRole)) {
    const cvs = state.cvs.filter((row) => row.state === "in-review" || row.state === "parsed").length;
    if (cvs > 0) {
      items.push({
        id: "hr-cvs",
        hat: "hr",
        tone: "act",
        count: cvs,
        title: `${cvs} ${plural(cvs, "CV")} to review`,
        href: "/cv",
        action: "Review CVs",
      });
    }
    const corrections = state.corrections.filter((row) => row.status === "open").length;
    if (corrections > 0) {
      items.push({
        id: "hr-corrections",
        hat: "hr",
        tone: "act",
        count: corrections,
        title: `${corrections} correction ${plural(corrections, "request")} to resolve`,
        href: "/people",
        action: "Open People",
      });
    }
  }

  return items;
}
