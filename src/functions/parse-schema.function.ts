import type { ParserBuildOptions } from 'peggy'
import type { RFC4512ParserOptions } from '../interfaces'
import RFC4512Parser from '../rfc4512.parser'
import type { LDAPSchemaType } from '../types'

/**
 * `RFC4512Parser` instances are stateless past construction (the grammar is
 * precompiled — see `scripts/build-grammar.mjs`), so a `parseSchema()` call
 * doesn't need to build a fresh one every time. Callers commonly parse
 * hundreds or thousands of definitions from a single subschema, each with
 * the same options — memoizing by options keeps that a single allocation.
 */
const parserCache = new Map<string, RFC4512Parser>()

function parserFor(options?: RFC4512ParserOptions): RFC4512Parser {
  const key = JSON.stringify(options ?? {})
  let parser = parserCache.get(key)
  if (!parser) {
    parser = new RFC4512Parser(options)
    parserCache.set(key, parser)
  }
  return parser
}

/**
 * Utility function to parse a schema definition
 * (shortcut for creating an instance and parsing)
 *
 * @param schemaDefinition - The definition to parse
 * @param options - Parser configuration options
 * @param pegOptions - Deprecated, unused. The grammar is now precompiled
 * ahead of time, so there is nothing left for Peggy build options to
 * configure at parse time. Kept for backward compatibility.
 * @returns Parsed schema data
 * @throws {RFC4512ParserError} When parsing fails with detailed error information
 */
export function parseSchema<T extends LDAPSchemaType>(schemaDefinition: string, options?: RFC4512ParserOptions, pegOptions?: ParserBuildOptions): T {
  void pegOptions
  return parserFor(options).parseSchema(schemaDefinition)
}
