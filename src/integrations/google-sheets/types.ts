/** Rozhraní modulu Google Sheets. Výpadek modulu rozbije jen import, nic jiného. */
export interface SheetTab { title: string; gid: number }

export interface SheetsSource {
  listTabs(spreadsheetId: string): Promise<SheetTab[]>;
  readTab(spreadsheetId: string, tab: SheetTab): Promise<string[][]>;
}

export class SheetsError extends Error {
  constructor(public code: 'google_login' | 'not_found' | 'forbidden' | 'bad_url' | 'unavailable', message?: string) {
    super(message ?? code);
  }
}
