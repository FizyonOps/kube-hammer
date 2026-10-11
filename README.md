# Kube Hammer open-source plugins

Source code of the free plugins that ship inside [Kube Hammer](https://hammer.fizyonops.com), published so anyone can read exactly what they do.

Exported from Kube Hammer **development snapshot after v0.6.182**. Each release of the app is tagged here as `v<version>`, and the app's
"View source" button links to the tag matching the version you are running.

## Plugins

| Plugin ID | Source |
| --- | --- |
| `performance-dashboard` | [`src/plugins/PerformanceDashboardPlugin.tsx`](src/plugins/PerformanceDashboardPlugin.tsx) |
| `resource-visualization` | [`src/plugins/ResourceVisualizationPlugin.tsx`](src/plugins/ResourceVisualizationPlugin.tsx) |
| `command-palette` | [`src/plugins/CommandPalettePlugin.tsx`](src/plugins/CommandPalettePlugin.tsx) |
| `workspace-manager` | [`src/plugins/WorkspaceManagerPlugin.tsx`](src/plugins/WorkspaceManagerPlugin.tsx) |
| `resource-badge` | [`src/plugins/ResourceBadgePlugin.tsx`](src/plugins/ResourceBadgePlugin.tsx) |
| `lens-compat-columns` | [`src/plugins/LensCompatColumnsPlugin.tsx`](src/plugins/LensCompatColumnsPlugin.tsx) |
| `clipboard-history` | [`src/plugins/ClipboardHistoryPlugin.tsx`](src/plugins/ClipboardHistoryPlugin.tsx) |
| `yaml-schema-validation` | [`src/plugins/YamlSchemaValidationPlugin.tsx`](src/plugins/YamlSchemaValidationPlugin.tsx)<br>[`src/plugins/YamlSchemaValidationUtils.ts`](src/plugins/YamlSchemaValidationUtils.ts) |
| `example-sdk-guide` | [`src/plugins/ExampleSDKGuidePlugin.tsx`](src/plugins/ExampleSDKGuidePlugin.tsx) |

## What is in this repository

- The plugin files above are byte-identical copies of the files compiled into the app, at their original paths.
- The `*.d.ts` files under `src/` are generated type declarations for the closed-source Kube Hammer core modules
  these plugins import (plugin registry, SDK, stores, shared components). They describe the API the plugins use and
  contain no implementation.
- The repository is for reading and reference. It does not build the app or the plugins on its own.

## License

Apache License 2.0, see [LICENSE](LICENSE). The Kube Hammer application itself is proprietary.
