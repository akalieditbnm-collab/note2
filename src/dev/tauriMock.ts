/**
 * Browser-only Tauri shim used by the local UI preview.
 *
 * `vite.config.ts` (in /home/user/ui-preview) aliases the whole
 * `@tauri-apps/api` package to this file, so subpath imports such as
 * `@tauri-apps/api/core` and `@tauri-apps/api/window` resolve to the exports
 * below. It is never bundled into the desktop application.
 */

type PreviewNote = { id: string; title: string; parentId: string | null };

type PreviewState = {
  pages: PreviewNote[];
  favorites: string[];
  trash: PreviewNote[];
  documents: Record<string, unknown[]>;
  settings: Record<string, string>;
};

const STORAGE_KEY = "localnote.preview.state";
const now = () => new Date().toISOString();

const ARABIC_PAGES: PreviewNote[] = [
  { id: "p1", title: "مشروع الواجهة", parentId: null },
  { id: "p2", title: "ملاحظات اجتماع", parentId: "p1" },
  { id: "p3", title: "أفكار", parentId: "p1" },
  { id: "p4", title: "مهام الأسبوع", parentId: null },
  { id: "p5", title: "كود مرجعي", parentId: null },
];

/** Switches the seeded demo content when the UI language changes. */
function applyLanguageContent() {
  if (isArabic()) {
    state.pages.forEach((page) => {
      const translation = ARABIC_PAGES.find((candidate) => candidate.id === page.id);
      if (translation) page.title = translation.title;
    });
    Object.keys(state.documents).forEach((id) => {
      state.documents[id] = seedBlocks(pageTitle(id));
    });
  }
  persist();
}

const isArabic = () => window.localStorage.getItem("localnote.locale") === "ar";

const seedBlocks = (title: string) => {
  const arabic = isArabic();
  return [
    {
      id: "b1",
      type: "heading",
      props: { level: 1 },
      content: arabic ? `مرحبًا بك في ${title}` : `Welcome to ${title}`,
      children: [],
    },
    {
      id: "b2",
      type: "paragraph",
      content: arabic
        ? "هذه هي الواجهة الحقيقية للتطبيق بعد إضافة اللغة العربية. جرّب تحرير هذا النص، أو اكتب / لإدراج كتلة جديدة."
        : "This is the real application UI after localization. Try editing this text, or type / to insert a block.",
      children: [],
    },
    {
      id: "b3",
      type: "bulletListItem",
      content: arabic
        ? "كل شيء محفوظ على هذا الجهاز فقط"
        : "Everything stays on this device",
      children: [],
    },
    {
      id: "b4",
      type: "checkListItem",
      props: { checked: true },
      content: arabic ? "تم تفعيل الواجهة العربية" : "Arabic interface enabled",
      children: [],
    },
    {
      id: "b5",
      type: "codeBlock",
      props: { language: "typescript" },
      content: 'const greeting: string = "مرحبا";',
      children: [],
    },
  ];
};

function initialState(): PreviewState {
  const arabic = isArabic();
  const pages: PreviewNote[] = [
    { id: "p1", title: arabic ? "مشروع الواجهة" : "Design project", parentId: null },
    { id: "p2", title: arabic ? "ملاحظات اجتماع" : "Meeting notes", parentId: "p1" },
    { id: "p3", title: arabic ? "أفكار" : "Ideas", parentId: "p1" },
    { id: "p4", title: arabic ? "مهام الأسبوع" : "Weekly tasks", parentId: null },
    { id: "p5", title: arabic ? "كود مرجعي" : "Reference code", parentId: null },
  ];
  return {
    pages,
    favorites: ["p4"],
    trash: [{ id: "t1", title: arabic ? "مسودة قديمة" : "Old draft", parentId: null }],
    documents: Object.fromEntries(pages.map((page) => [page.id, seedBlocks(page.title)])),
    settings: {
      theme: "system",
      accent_color: "#3b6fe5",
      spellcheck: "system",
      language: isArabic() ? "ar" : "en",
    },
  };
}

function load(): PreviewState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as PreviewState;
    return { ...initialState(), ...parsed };
  } catch {
    return initialState();
  }
}

const state = load();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

const pageTitle = (id: string) =>
  state.pages.find((page) => page.id === id)?.title ?? "Untitled";

export async function invoke<T>(
  command: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 10));

  switch (command) {
    case "database_status":
      return { ready: true, path: "preview" } as T;
    case "list_pages":
      return state.pages.map((page, index) => ({
        ...page,
        position: index,
        isFavorite: state.favorites.includes(page.id),
        createdAt: now(),
        updatedAt: now(),
        lastOpenedAt: index === 0 ? now() : null,
      })) as T;
    case "create_page": {
      const id = `p${Date.now()}`;
      state.pages.push({
        id,
        title: isArabic() ? "بدون عنوان" : "Untitled",
        parentId: (args.parentId as string | null) ?? null,
      });
      state.documents[id] = [
        { id: `${id}-b1`, type: "paragraph", content: "", children: [] },
      ];
      persist();
      return {
        id,
        title: pageTitle(id),
        parentId: args.parentId ?? null,
        position: state.pages.length,
        isFavorite: false,
        createdAt: now(),
        updatedAt: now(),
        lastOpenedAt: now(),
      } as T;
    }
    case "rename_page": {
      const page = state.pages.find((candidate) => candidate.id === args.id);
      if (page) page.title = String(args.title ?? page.title);
      persist();
      return true as T;
    }
    case "move_page":
    case "delete_page":
    case "restore_page":
    case "delete_page_permanently":
    case "empty_trash":
      return true as T;
    case "set_page_favorite": {
      const id = String(args.id);
      if (args.isFavorite) {
        if (!state.favorites.includes(id)) state.favorites.push(id);
      } else {
        state.favorites = state.favorites.filter((favorite) => favorite !== id);
      }
      persist();
      return true as T;
    }
    case "load_document": {
      const id = String(args.pageId ?? args.id);
      return {
        pageId: id,
        contentJson: JSON.stringify(state.documents[id] ?? []),
      } as T;
    }
    case "save_document": {
      const id = String(args.pageId ?? args.id);
      try {
        state.documents[id] = JSON.parse(String(args.contentJson ?? "[]"));
      } catch {
        state.documents[id] = [];
      }
      persist();
      return true as T;
    }
    case "search_pages": {
      const query = String(args.query ?? "").toLocaleLowerCase();
      return state.pages
        .filter((page) => page.title.toLocaleLowerCase().includes(query))
        .map((page) => ({
          pageId: page.id,
          title: page.title,
          snippet: isArabic() ? "مقتطف من نص الملاحظة…" : "A snippet of saved note text…",
        })) as T;
    }
    case "get_theme":
      return (state.settings.theme ?? "system") as T;
    case "set_theme":
      state.settings.theme = String(args.preference);
      persist();
      return state.settings.theme as T;
    case "get_accent_color":
      return (state.settings.accent_color ?? "#3b6fe5") as T;
    case "set_accent_color":
      state.settings.accent_color = String(args.hex);
      persist();
      return state.settings.accent_color as T;
    case "get_spellcheck":
      return (state.settings.spellcheck ?? "system") as T;
    case "set_spellcheck":
      state.settings.spellcheck = String(args.preference);
      persist();
      return state.settings.spellcheck as T;
    case "get_language":
      return (state.settings.language ?? "en") as T;
    case "set_language":
      state.settings.language = String(args.language);
      applyLanguageContent();
      return state.settings.language as T;
    case "get_storage_info":
      return {
        dataRoot: "C:\\Users\\You\\AppData\\Local\\LocalNote",
        databasePath: "C:\\Users\\You\\AppData\\Local\\LocalNote\\Data\\localnote.db",
        webviewDataPath: "C:\\Users\\You\\AppData\\Local\\LocalNote\\WebView\\main",
        backupPath: "C:\\Users\\You\\Documents\\LocalNote Backups",
      } as T;
    case "list_trash":
      return state.trash.map((page, index) => ({
        ...page,
        position: index,
        isFavorite: false,
        createdAt: now(),
        updatedAt: now(),
        lastOpenedAt: null,
        deletedAt: now(),
      })) as T;
    default:
      return undefined as T;
  }
}

export async function listen(): Promise<() => void> {
  return () => undefined;
}

export const getCurrentWindow = () => ({
  minimize: async () => undefined,
  toggleMaximize: async () => undefined,
  close: async () => undefined,
  destroy: async () => undefined,
  onCloseRequested: async (): Promise<() => void> => () => undefined,
});

export default { invoke, listen, getCurrentWindow };
