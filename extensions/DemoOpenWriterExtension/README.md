# DemoOpenWriterExtension

Bundled reference extension for the OpenWriter SDK.

What it demonstrates:

- SDK-driven activation and command registration
- branded extension assets and custom panel icon
- an HTML document panel mounted from `dist/panel/index.html`
- a framework-friendly message bridge: OpenWriter sends init data to the iframe, and the iframe can invoke extension commands

Source files live in `src/`. `dist/` contains the runtime artifact the app loads today.
