// src/hooks/useCasePreview.ts

import { useState } from "react";
import { getMockReport } from "../mock/mockReports";
import type { FullReport, MinimalReport } from "../mock/mockReports";
import type { SimilarCase } from "../types/SimilarCase";

export function useCasePreview() {
  const [selectedCase, setSelectedCase] = useState<
    FullReport | MinimalReport | null
  >(null);

  const [isOpen, setIsOpen] = useState(false);

  const openPreview = (sc: SimilarCase) => {
    // ⭐ Load paired-down or full mock report
    const report = getMockReport(sc.accession);

    // ⭐ Store the report, not the SimilarCase
    setSelectedCase(report);

    // ⭐ Open the drawer
    setIsOpen(true);
  };

  const closePreview = () => {
    setIsOpen(false);
  };

  return {
    selectedCase,
    isOpen,
    openPreview,
    closePreview,
  };
}