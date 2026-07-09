# Vendored from Pascal Editor (MIT)

These node definitions are vendored from **https://github.com/pascalorg/editor**
(`packages/nodes`, tag **v0.9.1**, MIT License).

`@pascal-app/nodes` is an unpublished workspace package, but it's required to
populate the editor's client-side node registry (walls, zones, slabs, doors,
windows, items, levels, etc.). A standalone consumer of the published
`@pascal-app/editor` must therefore vendor it. `lib/bootstrap.ts` registers
`builtinPlugin` from here before `<Editor>` mounts.

The MEP nodes (ducts / pipes / HVAC / linesets) were removed — they reference
`@pascal-app/core` exports that don't exist in the published v0.9.1 (they're
newer than the last npm release), and a room-layout studio doesn't need them.

Upstream © Pascal contributors, MIT License. Pin to a matching tag when bumping
the published `@pascal-app/*` packages.
