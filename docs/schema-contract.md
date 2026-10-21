# Schema contract

`schemas/gameplay.schema.json` composes Design, Game, Content, Evaluation, Provenance and Adapter. All references are local; metadata id/version are required and independent of title. ContentUnit types are package-registered. Closed extension schemas resolve through ExtensionRegistry; unknown extension IDs fail.

The bundled validator supports a documented JSON Schema2020-12 subset (type/enum/const/object/array/string/numeric assertions, combinators, conditionals, local references, dependentRequired). Unsupported assertion keywords fail closed; this is not a claim to implement the entire JSON Schema standard. `$id` URLs identify schemas and are not fetched.

Validation performs structural schema checks, archetype references, runtime-mode/capability resolution, extension validation, rules version equality, content type and semantic content validation. Finally it resets a bounded runtime and checks its authoritative action space equals the declared action schema. This prevents a syntactically valid but runtime-incompatible declaration.

When generated content changes dimensions or batch size, use framework `materializeSpec` to update the action schema before validating the assembled spec.

Provenance confidence accepts confirmed/observed/inferred/suspected/unknown and never upgrades an assumption automatically.
