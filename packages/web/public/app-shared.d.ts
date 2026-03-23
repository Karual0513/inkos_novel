export interface UiCommandArgument {
  readonly name: string;
}

export interface UiCommandMetadata {
  readonly path: string;
  readonly description?: string;
  readonly supportsJson?: boolean;
  readonly arguments: ReadonlyArray<UiCommandArgument>;
}

export interface UiPrefillPayload {
  readonly arguments: Record<string, string>;
  readonly options: Record<string, string | boolean>;
}

export interface UiPrefillState {
  readonly commandPrefills?: Record<string, UiPrefillPayload>;
  readonly selectedBookId?: string;
  readonly selectedChapterNumber?: number | null;
}

export const COMMAND_CATEGORIES: Record<string, { readonly label: string; readonly order: number }>;
export const COMMAND_LABELS: Record<string, { readonly label: string; readonly category: string; readonly order: number; readonly description: string }>;
export const BOOK_STATUS_LABELS: Record<string, string>;
export const CHAPTER_STATUS_LABELS: Record<string, string>;
export const GENRE_LABELS: Record<string, string>;
export const PLATFORM_LABELS: Record<string, string>;
export const REVISE_MODE_LABELS: Record<string, string>;

export function localizeCommand<T extends UiCommandMetadata>(command: T): T & {
  readonly uiLabel: string;
  readonly uiDescription: string;
  readonly uiCategory: string;
  readonly uiCategoryLabel: string;
  readonly uiCategoryOrder: number;
  readonly uiOrder: number;
};

export function buildPrefillFromDataset(dataset: Record<string, string | undefined>): UiPrefillPayload;
export function getCommandPrefill(command: UiCommandMetadata, uiState: UiPrefillState): UiPrefillPayload;
export function getCommandDisplayName(commandPath: string): string;