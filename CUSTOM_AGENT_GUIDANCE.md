# Custom Agent Guidance

This repository contains reusable APIEase examples and a curated examples knowledge base. Keep project-specific guidance here and in `CUSTOM_README.md`; do not change template-owned defaults or the imported product knowledge base for this workflow.

## Examples as knowledge for Apex

- Author examples so Apex can borrow concrete resource patterns when building a merchant's requirements. Explain why the resources exist, their exact invocation contracts, and the complete dependency graph; resource JSON alone is not sufficient context.
- Distinguish reusable mechanisms from the reference scenario's policies. Fixture creation, run tags, title prefixes, draft status, selected-attempt limits, cleanup, and inventory policy in the product-import example are not universal store requirements.
- Preserve verified source when copying it into the catalogue. Explain the shop identities and configuration that an agent must adapt in its own project. Keep store-specific versions in separate example packages when identical handles have different behavior.
- Include runtime limits, performance tradeoffs, and the caller's persistence/recovery responsibilities. State which behavior was observed live, which was covered by controlled tests, and which optional resources were not part of the verified path.
- Examples do not grant mutation authority or carry credentials. Enroll the intended README explanations and resources in the knowledge-base manifest so a future consumer receives both the implementation and its constraints.

## Authoring example READMEs

- Give each README one top-level `#` title outside the knowledge base blocks.
- When generating or updating an example, surround its subject-specific explanation with paired, standalone `<!-- apiease-kb:start -->` and `<!-- apiease-kb:end -->` comments outside fenced code. Multiple blocks are supported and appear in document order. Never nest blocks or leave them empty or unmatched.
- Include the problem, architecture, resource roles, execution flow, inputs, response shapes, and useful requirements or limitations. Keep necessary scopes, server-side authorization, trigger configuration, and other constraints in the included explanation even if they originally appeared in setup steps or an “Important notes” section.
- Keep installation walkthroughs, generic reminders, promotional copy, and reference-link collections outside the blocks. Organize the original README for humans; do not duplicate an explanation solely for the knowledge base.
- Use relative Markdown links normally in prose; the generator resolves them to canonical GitHub URLs. Keep reference-link definitions used by included prose inside included blocks. Code examples are preserved except for the exact development-host normalization described in `CUSTOM_README.md`.

## Enrollment and maintenance

- `docs/knowledgebase/examples.json` explicitly enrolls examples and individual files in bundle order. Paths to examples are relative to the repository root; file paths are relative to that example. Only `README.md` and selected JSON in configured resource directories are supported. Do not add `answer.md`, `create-resources.sh`, or other files implicitly.
- README markers curate content; they do not enroll an example. Add a manifest entry only when that example and its files are deliberately selected for the bundle.
- Never edit `docs/knowledgebase/apiEaseExamplesConsolidated.md` manually. For changes to selected content, selections, markers, or generation logic, rebuild and check it:

  ```bash
  node scripts/knowledgebase/buildApiEaseExamplesKnowledgeBase.js
  node --test test/examples-knowledgebase.test.js
  node scripts/knowledgebase/buildApiEaseExamplesKnowledgeBase.js --check
  ```

- Generation normalizes only the exact development hostname `store-apiease-admin-local.myshopify.com` to `yourstore.myshopify.com` in emitted content. Preserve source resource files; normalization is not a source migration.
- Keep implementation within this repository. Importing the bundle into `../apiease` and connecting it to the assistant are separate consumer-integration work.
