/**
 * ⚠️ WARNING! This is just an implementation of the resolver spec
 * for demo purposes. It is subject to change, or possibly fall out
 * of sync with the specification. In case of a deviation, prefer
 * the official specification over this example library.
 */
import z from 'zod/v4';
import { mergeTokenSets } from './set.js';
import type { DTCGTokens, Resolver } from './types.js';
import { getTokenIDs, mergeTokens } from './utils.js';

const tokenMapSchema = z.looseObject({});

function validateTokenMap<T extends Record<string, any>>(
  tokenMap: unknown,
): Record<string, T> {
  return tokenMapSchema.parse(tokenMap);
}
const tokenSetSchema = z.object({
  name: z.string({ error: 'Missing "name"' }),
  values: z.array(z.string({ error: 'Expected string' })),
});
const resolverSchema = z.object({
  name: z.string({ error: 'Missing "name"' }),
  description: z.optional(z.string({ error: 'Expected string' })),
  sets: z.array(tokenSetSchema, { error: 'Missing "sets"' }),
  modifiers: z.optional(
    z.array(
      z.object({
        name: z.string({ error: 'Missing "name"' }),
        values: z.array(tokenSetSchema),
      }),
    ),
  ),
});

function validateResolver(resolver: unknown): Resolver {
  return resolverSchema.parse(resolver);
}

export function createResolver<T extends Record<string, any> = DTCGTokens>(
  tokenMapRaw: Record<string, T>,
  resolverRaw: Resolver,
) {
  const tokenMap = validateTokenMap<T>(tokenMapRaw);
  const resolver = validateResolver(resolverRaw);
  if (!Object.keys(tokenMap ?? {}).length) {
    throw new Error(`Empty token map! No tokens to resolve`);
  }

  const tokens: T = resolver?.sets?.length
    ? mergeTokenSets(
        resolver.sets.flatMap(({ name, values }) => {
          if (!values?.length) {
            throw new Error(
              `Token set ${name} can’t contain empty array of values`,
            );
          }
          return values.map<T>((id) => getTokens(id));
        }),
      )
    : ({} as T);

  function getTokens(id: keyof typeof tokenMap) {
    if (!(id in tokenMap)) {
      throw new Error(`Tokens "${id}" missing in tokenMap!`);
    }
    return tokenMap[id];
  }

  return {
    tokens,
    getTokens,
    apply(values: Record<string, string>): T {
      if (!resolver.modifiers?.length) {
        throw new Error(`No modifiers defined, nothing to apply()`);
      }
      if (!Object.keys(values ?? {}).length) {
        throw new Error(`Can’t apply an empty value set`);
      }

      let finalTokens = structuredClone(tokens);
      const modified = new Set<string>();

      for (const [name, value] of Object.entries(values)) {
        const modifier = resolver.modifiers.find((mod) => mod.name === name);
        // Note: this should be a validation error sooner
        if (!modifier) {
          throw new Error(`Modifier ${name} not defined!`);
        }
        const modVal = modifier.values.find((v) => v.name === value);
        if (!modVal) {
          throw new Error(`Modifier ${name} has no ${value} defined`);
        }
        for (const id of modVal.values) {
          const modifiedTokens = getTokens(id as keyof typeof tokenMap);
          for (const id of getTokenIDs(modifiedTokens)) {
            modified.add(id);
          }
          finalTokens = mergeTokens(finalTokens, modifiedTokens);
        }
      }

      return {
        ...finalTokens,
        $extensions: { modified: [...modified] },
      };
    },
  };
}
