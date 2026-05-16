import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function usePageTitle(titleKey: string) {
  const { t } = useTranslation();

  useEffect(() => {
    const pageTitle = t(titleKey);
    const appName = t("app.name");
    document.title = `${pageTitle} | ${appName}`;
  }, [titleKey, t]);
}
