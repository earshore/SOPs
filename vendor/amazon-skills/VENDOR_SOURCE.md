# Amazon Skills vendor snapshot

- **Upstream:** https://github.com/nexscope-ai/Amazon-Skills
- **License:** MIT
- **Imported:** 2026-07-21 via GitHub archive (`main` zip) because git clone/submodule fetch to github.com failed in this environment (HTTPS 443 reset).
- **Intended path:** keep content at `vendor/amazon-skills/*/SKILL.md` for Vite `import.meta.glob`.
- **Upgrade path:** when network allows, replace this tree with a proper git submodule:

```bash
rm -rf vendor/amazon-skills
git submodule add https://github.com/nexscope-ai/Amazon-Skills.git vendor/amazon-skills
git submodule update --init --recursive
```
