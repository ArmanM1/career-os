# Resume Library

## Goal

The resume library should make it easy to see, compare, generate, compile, and approve resume variants.

Resumes should be written in LaTeX using the user's established format.

## Library Structure

Recommended local structure:

```text
resumes/
  templates/
    base-template.tex
  bases/
    arman-base-swe.tex
    arman-base-founder.tex
  variants/
    apple-swe-intern-2027/
      resume.tex
      resume.pdf
      metadata.json
      diff.md
    fde-adjacent-startup-2027/
      resume.tex
      resume.pdf
      metadata.json
      diff.md
```

The database stores metadata. The local worker stores and compiles files.

## Objects

### ResumeTemplate

```ts
type ResumeTemplate = {
  id: string;
  name: string;
  latexPath: string;
  description?: string;
  isDefault: boolean;
};
```

### ResumeVersion

```ts
type ResumeVersion = {
  id: string;
  name: string;
  track: "swe" | "entrepreneurship" | "fde" | "general";
  latexPath: string;
  pdfPath?: string;
  templateId: string;
  status: "active" | "archived";
};
```

### ResumeVariant

```ts
type ResumeVariant = {
  id: string;
  baseVersionId: string;
  applicationId?: string;
  companyId?: string;
  roleTargetId?: string;
  latexPath: string;
  pdfPath?: string;
  status: "draft" | "ready_for_review" | "approved" | "used" | "archived";
  generatedByAgentRunId?: string;
  rationale: string;
};
```

### ResumeBullet

```ts
type ResumeBullet = {
  id: string;
  experienceId: string;
  text: string;
  tags: string[];
  metrics: string[];
  targetRoles: string[];
  status: "active" | "needs_review" | "archived";
};
```

## UX Requirements

The user should be able to:

- View all base resumes and variants.
- Open compiled PDFs.
- Open LaTeX source.
- See diff from base version.
- See why a variant was generated.
- See which application a variant belongs to.
- Approve a variant before it is used.
- Mark a variant as used for an application.

## Agent Rules

The Resume Tailor agent may:

- create a new variant
- modify LaTeX files in the resume library
- compile PDFs
- propose bullet changes
- link a variant to an application

The Resume Tailor agent may not:

- submit an application
- upload a resume to an external site without approval
- overwrite a base resume without approval
- delete a variant without approval

## First Workflow

```text
Application selected
  -> Resume Tailor reads role/company context
  -> selects base resume
  -> creates LaTeX variant
  -> compiles PDF
  -> creates diff/rationale
  -> marks variant ready_for_review
  -> UI shows PDF, source, diff, and approval action
```

