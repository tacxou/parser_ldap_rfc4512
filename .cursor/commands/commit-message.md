# Générer un message de commit

Analyser uniquement les fichiers stagés (`git diff --cached`). Si l'index est
vide, le signaler et s'arrêter.

Appliquer `commit-convention.md` et, s'il est exposé, le skill `commit-message`
de `.agents/skills/` ou `.claude/skills/`.

Restituer le message proposé, le bump SemVer s'il est justifié, et la commande
prête à copier-coller. Ne pas exécuter `git commit` ni `git push`.
