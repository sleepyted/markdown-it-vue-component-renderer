# Markdown Vue Runtime Redesign

## Context

The library currently works for simple demos, but the implementation has structural problems that limit correctness and reuse:

- `mountComponents()` mounts Vue apps repeatedly without a destroy path, which leaks mounted instances in dynamic render flows.
- `MarkdownRenderer` duplicates mounting logic, does not clean up on component unmount, and can race during rapid content updates.
- The parser treats any later `:::` line as a close marker and can consume too much content when the container is malformed.
- Container body handling is weak. Non-JSON body content is effectively discarded unless a custom parser is supplied.
- Public types and runtime behavior diverge. Some supported signatures are not actually implemented consistently.

The goal of this redesign is to keep the public entry points and core authoring syntax while rebuilding the internals into a parser/runtime split that is safer, easier to extend, and correct under dynamic updates.

## Goals

- Preserve the existing main entry points:
  - `MarkdownVueComponent`
  - `MarkdownRenderer`
  - `mountComponents`
- Preserve the current container syntax shape:
  - `:::componentName {...}`
  - body lines
  - closing `:::`
- Eliminate runtime leaks in plugin mode and renderer mode.
- Make container parsing fail safe when markup is malformed.
- Make container body content usable by default instead of silently dropping it.
- Align TypeScript types, README examples, and real runtime behavior.
- Add automated tests for parser behavior, runtime cleanup, and dynamic rerender handling.

## Non-Goals

- Full slot system support
- SSR support
- Arbitrary nested container semantics
- Visual redesign of the example app

## Recommended Approach

Use a three-layer design:

1. Parser/compiler layer
2. Runtime/mounter layer
3. Vue renderer orchestration layer

This keeps responsibilities narrow:

- Parser: recognize markdown containers and encode stable metadata into rendered HTML.
- Runtime: find component placeholders, mount Vue apps, track them, and destroy them.
- Renderer: render markdown to HTML and coordinate runtime lifecycle during updates.

This approach is larger than a tactical fix, but it addresses the current architectural problems directly and gives the project a clean base for later slot or richer body handling support.

## Architecture

### 1. Parser/Compiler Layer

`MarkdownVueComponent` remains the markdown-it plugin entry point, but its internals are rebuilt around explicit container parsing.

Responsibilities:

- Match start lines of the form `:::name` with optional inline JSON arguments.
- Scan for a valid standalone closing line `:::`.
- Refuse malformed containers by returning `false` so markdown-it falls back to normal markdown parsing.
- Collect container metadata:
  - component name
  - inline args string
  - raw body text
  - derived props
  - body format marker

The rendered HTML will contain one wrapper element per component placeholder with normalized data attributes.

### 2. Runtime/Mounter Layer

Introduce an internal runtime helper shared by plugin mode and `MarkdownRenderer`.

Responsibilities:

- Scan a container element for component placeholders.
- Decode placeholder metadata from dataset attributes.
- Resolve registered Vue components.
- Mount Vue apps.
- Track mounted apps and mount points.
- Destroy all mounted apps deterministically.

`mountComponents()` will delegate to this runtime and return a controller object instead of `void`.

### 3. Renderer Layer

`MarkdownRenderer` becomes a thin coordinator over markdown-it plus the shared runtime.

Responsibilities:

- Build a markdown-it instance with configured options.
- Render markdown to HTML.
- Replace container HTML.
- Mount components through the shared runtime.
- Track a render version so stale async work is discarded.
- Destroy mounted apps on rerender and on Vue component unmount.

## Syntax and Parsing Rules

### Opening Syntax

Supported opening line:

```md
:::alert {"type":"warning"}
```

Interpretation:

- `alert` is the component key.
- The remainder of the line, when present, is parsed as a JSON object.

If inline JSON is present but invalid, the parser will not throw. It will treat inline props as empty and continue.

### Closing Syntax

Supported closing line:

```md
:::
```

Rules:

- The closing marker must be a standalone trimmed line.
- If no closing marker is found, the plugin returns `false` for that block so markdown-it parses the content normally.
- The parser does not consume the rest of the document when a close marker is missing.

### Body Semantics

The container body is handled in three modes:

1. Body is a JSON object
   - Merge it into props.
   - Body props override inline props on key conflict.

2. Body is not a JSON object
   - Preserve it as plain text.
   - Pass it to the component as `content` by default.

3. `propsParser` is provided
   - It receives the raw body text and the real token context.
   - Its returned props are merged last and therefore win.

This preserves existing JSON-driven authoring while making non-JSON body content usable by default.

### Encoded Placeholder Metadata

Rendered placeholders will use normalized attributes:

- `data-vue-component`
- `data-vue-props`
- `data-vue-body`
- `data-vue-body-format`

The parser stores enough information for later runtime extensions without forcing a new HTML encoding format.

## Runtime API Design

### `mountComponents()`

New shape:

```ts
type MountedComponentsController = {
  destroy(): void;
  mountedCount: number;
};

async function mountComponents(
  container: HTMLElement,
  components: Record<string, Component | ComponentConfig>
): Promise<MountedComponentsController>
```

Compatibility notes:

- The exported function name stays the same.
- Existing callers that ignore the return value continue to work.
- Dynamic callers can now explicitly destroy prior mounts before rerendering.

### Component Registration Rules

Stable runtime support will focus on actual mountable Vue components:

- direct `Component`
- `ComponentConfig` with `component: Component`

String-based component names can still exist as compile-time identifiers, but runtime mounting behavior will no longer pretend they are fully supported when no real component object is available.

Types and documentation will be updated to reflect this clearly.

## `MarkdownRenderer` Design

`MarkdownRenderer` will use the shared runtime instead of inlining its own mount flow.

It will maintain:

- a current mounted controller
- a monotonically increasing render version

Render flow:

1. Increment render version.
2. Destroy the previous controller.
3. Render markdown to HTML.
4. Replace `innerHTML`.
5. Call shared runtime to mount placeholders.
6. If the render version is stale by the time mount resolves, destroy that result immediately and discard it.
7. On Vue unmount, destroy the active controller.

This guarantees that rapid updates do not leave old mounted apps behind and that only the latest render result stays active.

## Error Handling

- Invalid inline JSON: ignore inline props, continue rendering.
- Invalid body JSON when body is intended as JSON: fall back to treating body as plain text `content`.
- Invalid encoded props at runtime: warn and continue with empty props for that component.
- Missing component registration at runtime: skip mount for that placeholder and leave the wrapper element in place.
- Missing closing marker: fall back to ordinary markdown parsing for that block.

The library should prefer safe fallback behavior over partial or corrupt mounting.

## Testing Strategy

Add a new `tests/` directory and cover the redesign with focused tests.

Minimum coverage:

- closed container parses and renders placeholder metadata
- unclosed container falls back to normal markdown output
- inline JSON merges with body JSON and body wins on conflicts
- non-JSON body becomes default `content`
- `propsParser` receives raw body text and meaningful token context
- `mountComponents()` returns a controller and `destroy()` unmounts mounted apps
- repeated plugin-mode rerenders can destroy prior mounts cleanly
- `MarkdownRenderer` keeps only the latest async render active during rapid updates

Tests should use real runtime behavior where possible instead of mock-only coverage.

## Documentation Changes

Update `README.md` to describe:

- current container syntax
- body semantics and `content` fallback
- the `mountComponents()` controller return value
- recommended dynamic rendering pattern with explicit cleanup

Update example files to use the controller-based cleanup pattern in dynamic scenarios.

## Migration Notes

Expected behavior preserved:

- existing component container syntax
- direct `MarkdownRenderer` usage
- plugin mode followed by `mountComponents()`

Behavior intentionally changed:

- malformed unclosed containers no longer consume trailing markdown
- repeated mounts have a supported cleanup path
- plain body text is no longer silently dropped
- runtime support is documented around actual Vue component objects, not ambiguous string-only registrations

## Risks

- The parser rewrite touches the library's core behavior, so regression coverage matters.
- Example code may rely on implicit remount behavior and needs updating to avoid stale controller references.
- The new controller return type is backward compatible at call sites but still changes the formal API surface, so README and declaration files must be kept in sync.

## Implementation Outline

1. Add failing tests for parser fallback, body semantics, runtime destroy, and renderer rerender correctness.
2. Extract shared runtime mounting helpers.
3. Rewrite plugin parser and renderer output.
4. Rebuild `MarkdownRenderer` on top of the shared runtime.
5. Update example usage to destroy previous mounts explicitly.
6. Update README and exported types.
7. Run build and test verification.

## Acceptance Criteria

- Dynamic render flows can rerender repeatedly without leaving prior Vue apps mounted.
- `MarkdownRenderer` destroys all mounted children on rerender and unmount.
- Unclosed containers do not corrupt surrounding markdown.
- Non-JSON body text reaches components through a documented default prop.
- Public types match runtime behavior.
- Tests and build pass.
