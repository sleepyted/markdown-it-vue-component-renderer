# NPM Publish Refresh Design

Date: 2026-04-03

## Summary

Prepare this package for a first clean public npm release by:

- renaming the package to `markdown-it-vue-component-renderer`
- tightening npm metadata and packaging fields
- ensuring release builds do not publish stale `dist/` artifacts
- making the default README English for npm/GitHub visitors
- preserving Chinese documentation in a separate `README.zh-CN.md`

## Goals

- Make the package publishable under an available npm name.
- Make the npm package page clear, complete, and credible.
- Ensure published tarballs contain only current build output.
- Keep the library API unchanged for this refresh.

## Non-Goals

- No parser/runtime feature redesign.
- No example app redesign beyond doc consistency if needed.
- No new distribution formats beyond the current ESM build.

## Decisions

### Package Name

Use `markdown-it-vue-component-renderer`.

Reasoning:

- It emphasizes the package's role as a renderer for Vue components inside `markdown-it`.
- It is more descriptive than the current name.
- It was available in npm registry checks during design.

### Repository Identity

Assume the GitHub repository target is:

- `https://github.com/sleepyted/markdown-it-vue-component-renderer`

This URL will be used for:

- `repository`
- `homepage`
- `bugs`

## Package Metadata Changes

Update `package.json` to include:

- `name: "markdown-it-vue-component-renderer"`
- `version: "0.1.0"`
- a tighter English `description`
- `license: "MIT"`
- `repository`
- `homepage`
- `bugs`
- expanded `keywords`
- `exports` for the root entry
- `sideEffects: false`

Keep:

- `type: "module"`
- `main` and `types` pointing at `dist/index.*`
- `files: ["dist"]`

## Packaging and Release Flow

### Dist Hygiene

Release builds must start from a clean `dist/` directory so that removed source modules do not remain in published tarballs.

Implementation direction:

- add a `clean` script
- update `build` to clean first, then run `tsc`

### Publish Guards

Add release guard scripts so local publish commands verify the package before upload.

Implementation direction:

- `prepack`: run tests and build
- `prepublishOnly`: run tests and build

The exact script composition can reuse `build` to avoid duplication.

## Documentation Strategy

### English README

Replace the root `README.md` with an English document intended for npm/GitHub first contact.

The English README should include:

- one-paragraph project summary
- feature list
- install command
- recommended `MarkdownRenderer` usage
- manual `mountComponents()` usage with `RuntimeController`
- container syntax examples
- API summary
- dynamic rendering guidance
- development / release notes if still useful

### Chinese README

Preserve the existing Chinese documentation as `README.zh-CN.md`.

The English README should link to the Chinese README near the top. The Chinese README can link back to the English one.

## License

Add a root `LICENSE` file with the MIT license text and align it with the `package.json` license field.

## Verification

Before considering the refresh complete:

- `npm test` passes
- `npm run build` passes
- `npm pack --dry-run` shows only intended package contents
- the tarball no longer contains stale historical `dist/*` files unrelated to current source
- README links and package metadata render correctly

## Risks and Mitigations

### Name Availability Drift

The chosen package name was available during design, but npm availability can change at any time.

Mitigation:

- re-check the package name immediately before implementation is finalized or before publish

### Broken Repository Links

The repository URL is inferred from the provided GitHub username and chosen package name.

Mitigation:

- keep the URL centralized in `package.json`
- verify the repository exists before publish

### README Encoding / Content Drift

The current root README appears valid in-repo but should still be checked after rewriting to ensure npm displays it correctly.

Mitigation:

- review the rendered Markdown in GitHub or a local preview
- use plain UTF-8 text files
