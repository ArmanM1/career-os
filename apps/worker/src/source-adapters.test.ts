import { describe, expect, it } from "vitest";
import { parseCsv } from "./source-adapters";

describe("deterministic source adapters", () => {
  it("parses quoted CSV opportunity lists and ignores unrelated rows", () => {
    const signals = parseCsv(
      [
        "Company,Title,Location,URL,Deadline",
        'Example,"Software Engineering Intern","Denver, CO",https://example.com/jobs/1,2026-08-10',
        "Example,Office lunch,Denver,https://example.com/lunch,not-a-date",
      ].join("\n"),
      "https://example.com/list.csv",
    );
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      title: "Software Engineering Intern",
      companyName: "Example",
      location: "Denver, CO",
      canonicalUrl: "https://example.com/jobs/1",
      opportunityType: "internship",
    });
    expect(signals[0].deadlineAt).toBe("2026-08-10T00:00:00.000Z");
  });
});
