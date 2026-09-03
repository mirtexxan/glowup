# Permanent agent rules

- Never commit, print, paste, or expose `.env.local` or any credential value.
- Before concluding that private configuration was lost after a PC migration,
  read the recovery section in `README.md`.
- The encrypted archive must be extracted outside this repository. Copy only
  `.env.local` into the ignored repository root, validate each integration,
  and remove the temporary extraction.
- Preserve unrelated working-tree changes. In particular, do not silently
  stage or overwrite local edits while performing recovery work.
