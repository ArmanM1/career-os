const finalSubmitText = /^(submit|submit application|apply|send application|finish|complete application|register|confirm registration)$/i;
const finalSubmitSelector = /(^|[\s>+~,])(?:button|input)(?:\[type=["']?submit|:has-text\(["']?(?:submit|apply|finish|complete|register))/i;

export type FormFillStep = { selector: string; action: "fill" | "select" | "check" | "upload" | "click"; value?: string; accessibleName?: string; elementType?: string };

export function assertSafeFormFillPlan(steps: FormFillStep[]) {
  for (const step of steps) {
    if (step.action !== "click") continue;
    if (finalSubmitSelector.test(step.selector) || finalSubmitText.test(step.accessibleName?.trim() ?? "") || step.elementType?.toLowerCase() === "submit") {
      throw new Error(`Career OS blocked a final-submit control: ${step.accessibleName ?? step.selector}`);
    }
  }
  return steps;
}
