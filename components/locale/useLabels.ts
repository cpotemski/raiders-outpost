"use client";

import { useMemo } from "react";
import { useLocale } from "@/components/locale/LocaleProvider";
import { getLabels } from "@/lib/labels";

export const useLabels = () => {
  const { locale } = useLocale();
  return useMemo(() => getLabels(locale), [locale]);
};
