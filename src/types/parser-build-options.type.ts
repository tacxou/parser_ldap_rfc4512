/**
 * Backward-compatible shape for the deprecated parser build options parameter.
 *
 * The grammar is compiled ahead of time, so these values are intentionally
 * ignored. Keeping a structural object type lets existing callers pass their
 * former Peggy options without making Peggy a consumer dependency.
 */
export type ParserBuildOptions = Readonly<Record<string, unknown>>
