import * as commands from "./commands";
import type { AppState } from "./types";

/**
 * The commands the browser may ask the server to run, by name. Each one checks its own permissions against
 * `state.currentPersonId` / `state.currentRole`, which the server sets from the session, never from the request.
 * Login email changes and file uploads have their own API routes and are not listed here.
 */
export const COMMANDS = {
  createPerson: commands.createPerson,
  updatePerson: commands.updatePerson,
  confirmHire: commands.confirmHire,
  assignPosition: commands.assignPosition,
  addAssignment: commands.addAssignment,
  createPosition: commands.createPosition,
  updatePosition: commands.updatePosition,
  requestCorrection: commands.requestCorrection,
  resolveCorrection: commands.resolveCorrection,
  addCv: commands.addCv,
  decideCvField: commands.decideCvField,
  applyCv: commands.applyCv,
  rejectCv: commands.rejectCv,

  startKpiPlanning: commands.startKpiPlanning,
  startKpiMonitoring: commands.startKpiMonitoring,
  setKpiYearCheckInFrequency: commands.setKpiYearCheckInFrequency,
  setKpiPlanningEndDate: commands.setKpiPlanningEndDate,
  openKpiAdjustmentWindow: commands.openKpiAdjustmentWindow,
  closeKpiAdjustmentWindow: commands.closeKpiAdjustmentWindow,
  closeKpiYear: commands.closeKpiYear,
  createMissingKpiSets: commands.createMissingKpiSets,
  grantAdmin: commands.grantAdmin,
  revokeAdmin: commands.revokeAdmin,
  upsertKpiItem: commands.upsertKpiItem,
  removeKpiItem: commands.removeKpiItem,
  submitKpiSet: commands.submitKpiSet,
  agreeKpiSet: commands.agreeKpiSet,
  returnKpiSet: commands.returnKpiSet,
  addCheckIn: commands.addCheckIn,
  updateCheckIn: commands.updateCheckIn,
  agreeCheckIn: commands.agreeCheckIn,
  returnCheckIn: commands.returnCheckIn,

  openProject: commands.openProject,
  updateProject: commands.updateProject,
  addStaffing: commands.addStaffing,
  updateStaffing: commands.updateStaffing,
  deleteStaffing: commands.deleteStaffing,
  upsertWorkItem: commands.upsertWorkItem,
  deleteWorkItem: commands.deleteWorkItem,
  addDeliverable: commands.addDeliverable,
  updateDeliverable: commands.updateDeliverable,
  deleteDeliverable: commands.deleteDeliverable,
  addDeliverableStatus: commands.addDeliverableStatus,
  renameDeliverableStatus: commands.renameDeliverableStatus,
  reorderDeliverableStatuses: commands.reorderDeliverableStatuses,
  removeDeliverableStatus: commands.removeDeliverableStatus,
  addDeliverableCategory: commands.addDeliverableCategory,
  renameDeliverableCategory: commands.renameDeliverableCategory,
  reorderDeliverableCategories: commands.reorderDeliverableCategories,
  removeDeliverableCategory: commands.removeDeliverableCategory,
  fileLeaveRequest: commands.fileLeaveRequest,
  decideLeaveRequest: commands.decideLeaveRequest,
  withdrawLeaveRequest: commands.withdrawLeaveRequest,
  addLeaveType: commands.addLeaveType,
  renameLeaveType: commands.renameLeaveType,
  reorderLeaveTypes: commands.reorderLeaveTypes,
  removeLeaveType: commands.removeLeaveType,
  fileReimbursementRequest: commands.fileReimbursementRequest,
  editReimbursementRequest: commands.editReimbursementRequest,
  withdrawReimbursementRequest: commands.withdrawReimbursementRequest,
  decideReimbursementRequest: commands.decideReimbursementRequest,
  addPublicHoliday: commands.addPublicHoliday,
  renamePublicHoliday: commands.renamePublicHoliday,
  removePublicHoliday: commands.removePublicHoliday,
  applyIndonesiaHolidayFeed: commands.applyIndonesiaHolidayFeed,
  addTimeBlockType: commands.addTimeBlockType,
  renameTimeBlockType: commands.renameTimeBlockType,
  reorderTimeBlockTypes: commands.reorderTimeBlockTypes,
  removeTimeBlockType: commands.removeTimeBlockType,
  upsertTimeBlock: commands.upsertTimeBlock,
  deleteTimeBlock: commands.deleteTimeBlock,
  respondToInvite: commands.respondToInvite,
  setWeekGrid: commands.setWeekGrid,
  updatePersonContact: commands.updatePersonContact,
} as const;

export type CommandName = keyof typeof COMMANDS;
export type CommandArgs<N extends CommandName> = (typeof COMMANDS)[N] extends (state: AppState, ...args: infer A) => unknown
  ? A
  : never;
export type CommandOutput<N extends CommandName> = ReturnType<(typeof COMMANDS)[N]>;

export function isCommandName(name: unknown): name is CommandName {
  return typeof name === "string" && Object.prototype.hasOwnProperty.call(COMMANDS, name);
}

/** Calls a registered command with untyped arguments (the server's entry point). */
export function runCommand(name: CommandName, state: AppState, args: unknown[]): { state: AppState; error?: string | null } {
  const command = COMMANDS[name] as unknown as (state: AppState, ...rest: unknown[]) => { state: AppState; error?: string | null };
  return command(state, ...args);
}

/** A command result is a refusal when it carries an error message. */
export function refusal(result: { error?: unknown }): string | null {
  return typeof result.error === "string" && result.error.length > 0 ? result.error : null;
}
