import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { assertResumeWorkspacePath, resolveLatexEngine } from "./latex-compiler";

describe("LaTeX workspace boundary", () => {
  const root = resolve("career-os-workspace/resumes");
  it("accepts a resume inside the workspace", () => expect(assertResumeWorkspacePath(root, "variant/main.tex")).toBe(resolve(root, "variant/main.tex")));
  it("rejects traversal outside the workspace", () => expect(() => assertResumeWorkspacePath(root, "../../secrets.tex")).toThrow(/outside/i));
  it("honors an explicitly configured deterministic engine", () => {
    expect(resolveLatexEngine({ CAREER_OS_LATEX_ENGINE: "pdflatex", CAREER_OS_LATEX_PATH: "C:\\tex\\pdflatex.exe" })).toEqual({
      command: "C:\\tex\\pdflatex.exe",
      kind: "pdflatex",
    });
  });
});
