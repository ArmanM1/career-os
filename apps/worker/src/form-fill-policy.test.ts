import { describe, expect, it } from "vitest";
import { assertSafeFormFillPlan } from "./form-fill-policy";

describe("application form safety boundary", () => {
  it("allows preparation fields and expected autosave clicks", () => {
    expect(assertSafeFormFillPlan([{ selector: "#first-name", action: "fill", value: "A" }, { selector: "button[data-action=save-draft]", action: "click", accessibleName: "Save draft" }])).toHaveLength(2);
  });

  it.each([
    { selector: "button[type=submit]", action: "click" as const },
    { selector: "#finish", action: "click" as const, accessibleName: "Submit application" },
    { selector: "#register", action: "click" as const, elementType: "submit" },
  ])("blocks final submission: $selector", (step) => expect(() => assertSafeFormFillPlan([step])).toThrow(/blocked a final-submit/i));
});
