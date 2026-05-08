import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select value={i18n.language} onValueChange={(lang) => i18n.changeLanguage(lang)}>
        <SelectTrigger className="w-25">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{t("language.english")}</SelectItem>
          <SelectItem value="pl">{t("language.polish")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
