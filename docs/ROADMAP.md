# CHUD roadmap

This repository implements an initial vertical slice. It does not complete every phase of the supplied master brief.

1. **Foundation — implemented subset:** C++ frontend, source spans, syntax recovery, scoped checking, LLVM IR, native object generation/linking and runnable Windows x64 Hello World.
2. **Basic language — partial:** int/bool/static strings, locals, functions, branches and loops. Add remaining primitive types, richer constants and better multi-error semantics next.
3. **Project system — partial:** validated manifests, source discovery, new/build/run/check/test/clean and optimization settings. Add module resolution, libraries, dependency graph and caching.
4. **Runtime/library — minimal:** console output, checked integer division and static string equality. Define dynamic string/resource ownership before allocation, text, IO and collections.
5. **Studio — working foundation:** editor/explorer/tabs/split/save, native builds, PowerShell commands, diagnostics and persisted settings, including optional Discord Rich Presence. Add file operations, layout persistence, PTY and richer project search.
6. **ChudGPT — initial adapters:** all four documented IDs/contracts, explicit context, cancellation/errors and approved full-file diff replacement. Add persisted history, richer code actions and multi-file proposals.
7. **Language server — initial:** document diagnostics, incremental changes, keyword/builtin completion and function outline through shared compiler data. Connect Studio through LSP and add workspace navigation/rename/hover/signatures.
8. **Advanced language — not implemented:** structs, reference types, traits, generics, Result, collections, matching and async. Resolve the ownership model before adding heap semantics.
9. **Debugging/packages — not implemented:** add source debug metadata, a real DAP adapter, local path packages, lockfiles and path-validated archives.
10. **Public alpha distribution — not implemented:** relocatable SDK, installer, signing/update policy, representative benchmarks and release checklist. Current binaries are checkout-bound development builds.
