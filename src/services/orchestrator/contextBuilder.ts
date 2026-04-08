import { OrchestratorContext } from '../../types/orchestrator';

export function buildOrchestratorContext(
  caseData: any,
  templateConfig: any
): OrchestratorContext {
  return {
    adminHeader: {
      patientDemographics: caseData.patient.demographics,
      accessionNumber: caseData.accession,
      orderingPhysicians: caseData.orderingPhysicians,
      clinicalHistory: caseData.clinicalHistory,
      preOpDiagnosis: caseData.preOpDiagnosis
    },

    grossDescription: {
      specimens: caseData.specimens.map((s: any) => ({
        label: s.label,
        procedure: s.procedure,
        measurements: s.measurements,
        integrity: s.integrity,
        blockIndex: s.blockIndex
      }))
    },

    synopticData: {
      histologicType: caseData.synoptic.histologicType,
      histologicGrade: caseData.synoptic.histologicGrade,
      tumorSize: caseData.synoptic.tumorSize,
      marginStatus: caseData.synoptic.marginStatus,
      lymphovascularInvasion: caseData.synoptic.lvi,
      pTNMStage: caseData.synoptic.pTNM,
      lymphNodeStatus: caseData.synoptic.lymphNodes
    },

    ancillaryAndDiagnosis: {
      ihc: caseData.ancillary.ihc,
      molecular: caseData.ancillary.molecular,
      finalDiagnosis: caseData.finalDiagnosis,
      comment: caseData.comment
    },

    metadata: {
      caseId: caseData.caseId,
      timestamp: new Date().toISOString(),
      pathologist: caseData.pathologist,
      templateId: templateConfig.templateId
    }
  };
}