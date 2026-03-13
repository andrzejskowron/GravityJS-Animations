# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- Packaging and docs hardening for open-source readiness.
- Document versioning policy and rationale for the 1.x stable line.

## [1.0.0] - Initial release

- First public release of GravityJS.

## Versioning

GravityJS Animations follows [Semantic Versioning](https://semver.org/) for the published `gravityjs-animations` package and CDN bundle.
The **1.x** line signals that:

- The public API surface (`initComponents`, `initGravity`, `GravityEngine`, and documented `data-gravity-*` attributes) is considered stable.
- Typical import patterns (`import { initComponents } from 'gravityjs-animations'`) and the UMD global (`window.GravityJS`) will not change in a breaking way within 1.x.
- New features and bug fixes ship as **minor** (`1.y.0`) or **patch** (`1.y.z`) releases without breaking documented behaviour.

Any intentional breaking change to the public API will be released as a new **major** version (e.g. `2.0.0`), not as a 1.x update.
