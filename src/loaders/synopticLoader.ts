import { LoaderFunctionArgs, redirect } from "react-router-dom";
import { mockCaseService } from "../services/cases/mockCaseService";

export async function synopticLoader({ params }: LoaderFunctionArgs) {
  const caseId = params.caseId;

  if (!caseId) {
    console.error("Missing caseId in route params");
    return redirect("/worklist");
  }

  const caseData = await mockCaseService.getCase(caseId);

  if (!caseData) {
    console.error(`Case not found: ${caseId}`);
    return redirect("/worklist");
  }

  return caseData;
}