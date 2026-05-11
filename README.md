# Foundation

Foundation is a set of core concepts for building compounding systems.

The idea comes from my life as a Division 1 tennis player. The missing piece that held me back from achieving my highest goals was that I didn't learn the foundations early enough. In a tennis career, learning the foundations early not only prevents debt but enables systems that help you improve naturally over time. If you never learn the technical foundations early, for example, no amount of effort will allow you to avoid constantly relearning basic mechanics. Even worse, your technical debt will lead to mistakes and injuries that kill your career's momentum.

The same pattern holds in every serious domain. The people who reach the pinnacle learn and follow the foundational principles and rules. They do not treat fundamentals as beginner material. They use them as the base layer for compounding systems that enable them to improve over time.

This repo is the written substrate for that idea.

## Reading Order

1. Start with [The Compounding System](docs/compounding-systems.html). It explains the framework everything else fits inside.
2. Read [Core Principles](docs/principles/core-principles.html). These are the cross-domain rules for building systems that improve over time.
3. Read [The Spec System](docs/specs/index.html) when you are building or changing software. It defines where product intent, technical intent, test intent, related specs, code paths, and update obligations live.
4. Explore from there based on what you need: software-specific principles, the working spec, definitions, or spec templates.

## Core Concepts

- [The Compounding System](docs/compounding-systems.html)
- [Core Principles](docs/principles/core-principles.html)
- [Software Development Principles](docs/principles/sw-principles.html)
- [Building Software with Agents: A Working Spec](docs/general/operating-spec.html)
- [Spec System](docs/specs/index.html)
- [Definitions](docs/definitions/sw-definitions.html)

## Spec System

Specs are durable contracts for what should exist. They are not stale plans or traditional documentation. Start at [docs/specs/index.html](docs/specs/index.html) for the registry, templates, examples, linking model, and maintenance process.

Future agents should use the embedded registry in `docs/specs/index.html` to resolve spec IDs to files, related specs, owned implementation paths, and test coverage. When code behavior changes, update the relevant descriptive, technical, and test specs in the same commit.

## Thesis

Foundations prevent avoidable debt.

Technical debt, comprehension debt, process debt, and physical injury all rhyme: they come from repeated work on top of weak fundamentals. The earlier the foundation is learned, the more every later repetition compounds in the right direction.

The goal of this repo is to make those foundations explicit enough that people and agents can build systems that compound in value over time.
