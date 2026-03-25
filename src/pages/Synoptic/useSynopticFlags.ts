import { useState, useCallback } from 'react';
import type { FlagDefinition } from '../../types/FlagDefinition';
import type { CaseWithFlags } from '../../types/flagsRuntime';
import { getFlags } from '../../api/flagsApi';
import { getCaseWithFlags } from '../../api/caseFlagsApi';

export function useSynopticFlags(caseId: string) {
  const [flagCaseData,    setFlagCaseData]    = useState<CaseWithFlags | null>(null);
  const [flagDefinitions, setFlagDefinitions] = useState<FlagDefinition[]>([]);
  const [showFlagManager, setShowFlagManager] = useState(false);

  const openFlagManager = useCallback(async () => {
    const [defs, caseWithFlags] = await Promise.all([
      getFlags(),
      getCaseWithFlags(caseId),
    ]);
    setFlagDefinitions(defs);
    if (caseWithFlags) setFlagCaseData(caseWithFlags);
    setShowFlagManager(true);
  }, [caseId]);

  return {
    flagCaseData,    setFlagCaseData,
    flagDefinitions,
    showFlagManager, setShowFlagManager,
    openFlagManager,
  };
}
