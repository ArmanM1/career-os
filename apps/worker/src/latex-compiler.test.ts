import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { assertResumeWorkspacePath } from "./latex-compiler";

describe("LaTeX workspace boundary", () => {
  const root = resolve("career-os-workspace/resumes");
  it("accepts a resume inside the workspace", () => expect(assertResumeWorkspacePath(root, "variant/main.tex")).toBe(resolve(root, "variant/main.tex")));
  it("rejects traversal outside the workspace", () => expect(() => assertResumeWorkspacePath(root, "../../secrets.tex")).toThrow(/outside/i));
});
