# Contexte du projet

## Produit

- Objectif : bibliothèque TypeScript publiée sur npm (`@tacxou/parser_ldap_rfc4512`) qui parse les définitions de schéma LDAP RFC 4512 (attributeTypes, objectClasses, ldapSyntaxes), avec une API programmatique et un CLI (`rfc4512-parser`).
- Utilisateurs : développeurs Node/TypeScript consommant la lib comme dépendance, et opérateurs LDAP/OpenLDAP utilisant le CLI en ligne de commande.
- Contraintes métier majeures : conformité stricte à la RFC 4512 ; support des extensions OpenLDAP `cn=config` (préfixes d'index `{n}`, OID `OLcfg*At:`) en mode explicite (`relaxedMode`).

## Architecture actuelle

- Applications ou services : un seul package — bibliothèque + CLI dans le même dépôt (`src/index.ts` barrel, `src/cli.ts`).
- Frontières importantes : `src/rfc4512.parser.ts` (classe `RFC4512Parser`, API publique) s'appuie sur une grammaire Peggy compilée (`src/_grammars/rfc4512.pegjs` → artefact généré, gitignoré) ; `src/functions/parse-schema.function.ts` expose un raccourci fonctionnel avec cache d'instances.
- Sources de données : aucune — parsing pur de texte LDIF/schéma passé en entrée (chaîne ou fichier via le CLI).
- Intégrations externes : aucune (zéro dépendance runtime).

## Développement

- Runtime et versions : Node ≥ 22 (`engines.node`), TypeScript ^5 en peerDependency.
- Package manager : **Yarn Classic** (`packageManager: yarn@1.22.22`, lockfile `yarn.lock`), aligné sur l'outillage FicSys.
- Commande d'installation : `yarn install` (`yarn install --frozen-lockfile` en CI).
- Commande de développement : pas de serveur de dev (bibliothèque + CLI) ; `yarn build:grammar` régénère le parseur depuis la grammaire Peggy après modification de `src/_grammars/rfc4512.pegjs`.
- Commande de build : `yarn build` (tsup — ESM + CJS + `.d.ts`, cible `node22`) ; `prebuild` régénère automatiquement la grammaire.
- Commandes de lint, de type-check et de test : `yarn lint` (Biome, lecture seule) et `yarn lint:fix` / `yarn format` en écriture ; `yarn typecheck` (`tsc --noEmit`, `strict: true` activé) ; `yarn test` (Vitest, 30 suites, 310 tests), `yarn test:coverage` pour le lcov Codecov, `yarn test:cli` pour le CLI seul. Les hooks `pretest`/`prebuild` régénèrent la grammaire — contrairement à `bun test`, Yarn les honore, donc la CI n'a plus d'étape de génération séparée.
- Serveur de développement lancé par : sans objet (pas d'app serveur).

## Conventions spécifiques

- Langue de la documentation : anglais, sauf `CLI_USAGE.md` (français). Code, identifiants et commentaires techniques toujours en anglais.
- Conventions de code : Biome (`biome.json`) sans point-virgule, quotes simples, `lineWidth: 180`, virgules finales partout, 2 espaces, imports organisés automatiquement ; nommage kebab-case avec suffixe de type de fichier (`*.function.ts`, `*.interface.ts`, `*.type.ts`, `*.enum.ts`, `*.error.ts`) ; un `index.ts` barrel par dossier ; préfixe `_` pour le généré (`src/_grammars/`) et les fixtures invalides (`_bad-*.ldif`).
- Bibliothèques imposées ou interdites : zéro dépendance runtime imposée (le CLI bundle `yargs` via tsup bien qu'il ne soit qu'en devDependency) ; ne pas introduire de dépendance runtime.
- Documentation à maintenir avec le code : `README.md` (architecture, installation, usage) et `CLI_USAGE.md` en cas de changement du CLI.
- Dossiers en lecture seule : `src/_grammars/rfc4512.generated.{js,d.ts}` — artefact généré par `scripts/build-grammar.mjs`, jamais édité à la main.
- Contraintes de compatibilité : double publication ESM et CJS (`exports` conditionnel) ; ne jamais casser la résolution `main`/`module`/`types`/`exports` sans bump SemVer majeur.
- Exigences de sécurité ou de conformité :

## Livraison et exploitation

- Environnements : package npm public (registre npm officiel).
- Commande de release : déclenchée par une GitHub Release publiée (`.github/workflows/publish.yml`) — build + tests puis `npm publish --access public` depuis la racine du dépôt (le tarball est borné par `files: ["dist/**", "README.md", "LICENSE"]`).
- Déploiement : sans objet (bibliothèque/CLI, pas de service déployé).
- Observabilité : couverture de tests remontée à Codecov via `ci.yml`.
- Sauvegardes et rollback :

Ne consigner aucun secret dans ce fichier.

