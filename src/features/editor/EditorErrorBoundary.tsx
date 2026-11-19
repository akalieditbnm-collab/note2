import { Component, type ReactNode } from "react";
import { translate } from "../../i18n";
import { DEFAULT_LOCALE, type Locale } from "../../i18n/locales";

type Props = {
  children: ReactNode;
  onError: (error: Error) => void;
  /** Locale at render time; read from `<html data-locale>` so the boundary
   *  does not depend on React context (it may have already unmounted state). */
  locale?: Locale;
};

type State = { failed: boolean };

export class EditorErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  private currentLocale(): Locale {
    if (this.props.locale) return this.props.locale;
    const fromDom = document.documentElement.dataset.locale;
    return fromDom === "ar" || fromDom === "en" ? fromDom : DEFAULT_LOCALE;
  }

  render() {
    if (this.state.failed) {
      const t = (key: Parameters<typeof translate>[1]) =>
        translate(this.currentLocale(), key);
      return (
        <main className="empty-document" aria-label={t("editor.documentUnavailable")}>
          <div>
            <h1>{t("editor.noteUnavailable")}</h1>
            <p>{t("editor.noteUnavailableBody")}</p>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
