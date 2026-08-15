# Convention de messages de commit

Source de vérité du dépôt pour les messages de commit, lue par les agents IA et
par les générateurs natifs (VS Code, Cursor, GitHub Copilot). Si une convention
existe déjà ailleurs dans le dépôt, y renvoyer depuis ce fichier plutôt que de
la recopier.

## Format

```
type(scope): description
```

- Langue : anglais, sujet et corps.
- Sujet : impératif, minuscule après `:`, sans point final, ≤ 72 caractères.
- Corps : le pourquoi utile seulement, ligne ≤ 100 caractères.
- Pied de page : issues, co-auteurs, `BREAKING CHANGE:`.

## Types

`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
`chore`, `revert`.

## Scopes

Renseigner l'énumération réellement acceptée par l'outillage du dépôt (ex.
`scope-enum` de commitlint) et la correspondance chemin → scope. Ne jamais
inventer un scope absent de l'énumération ; l'omettre plutôt.

| Fichiers touchés | Scope |
| --- | --- |
| `src/rfc4512.parser.ts`, `src/functions/`, `src/interfaces/`, `src/types/`, `src/errors/`, `src/index.ts` | `parser` |
| `src/_grammars/*.pegjs`, `scripts/build-grammar.mjs` | `grammar` |
| `src/cli.ts` | `cli` |
| `tsup.config.ts`, `tsconfig.json`, `package.json` (champs de build/publication) | `build` |
| `.github/workflows/` | `ci` |
| `test/`, `test/samples/` | `test` |
| `README.md`, `CLI_USAGE.md` | `docs` |

## Ruptures

- Sujet : `feat(scope)!: description`.
- Ou pied de page : `BREAKING CHANGE: description`.

## Vérification locale

- Commande ou hook validant les messages :
- Longueur maximale du sujet imposée par l'outillage :

## Exemples valides

## Anti-exemples
