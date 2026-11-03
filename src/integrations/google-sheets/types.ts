/** Rozhraní modulu Google Sheets. Výpadek modulu rozbije jen import, nic jiného. */
export interface SheetTab { title: string; gid: number }

export interface SheetsSource {
  listTabs(spreadsheetId: string): Promise<SheetTab[]>;
  readTab(spreadsheetId: string, tab: SheetTab): Promise<string[][]>;
}

export interface CellWrite { row: number; col: number; value: string }

/** A9: zápis do trenérova sheetu. Potřebuje právo úprav (scope spreadsheets). */
export interface SheetsWriter {
  writeCells(spreadsheetId: string, tab: SheetTab, cells: CellWrite[]): Promise<void>;
}

export class SheetsError extends Error {
  constructor(public code: 'google_login' | 'not_found' | 'forbidden' | 'bad_url' | 'unavailable' | 'read_only', message?: string) {
    super(message ?? code);
  }
}
