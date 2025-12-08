# juice-shop-llm-ready

Strip comments and documentation from [OWASP Juice Shop](https://github.com/juice-shop/juice-shop) to create an LLM-friendly codebase.

## Why?

When using LLMs (Large Language Models) to analyze or work with code, comments and documentation can:
- Consume valuable context window tokens
- Add noise that distracts from the actual code logic
- Contain outdated or misleading information

This tool creates a "clean" version of Juice Shop with only functional code, perfect for:
- **LLM code analysis** - Feed pure code to AI assistants
- **Security research** - Focus on the actual vulnerable code
- **Training data** - Create cleaner datasets for fine-tuning
- **Code review** - See what the code actually does, not what comments say it does

## Installation

```bash
npm install -g juice-shop-llm-ready
```

Or use with npx (no installation required):

```bash
npx juice-shop-llm-ready
```

## Usage

### Basic Workflow

```bash
# 1. Clone juice-shop
git clone https://github.com/juice-shop/juice-shop
cd juice-shop

# 2. Preview what will be changed
npx juice-shop-llm-ready

# 3. Apply the changes
npx juice-shop-llm-ready --execute
```

### Options

```
juice-shop-llm-ready [options] [target-directory]

Arguments:
  target-directory    Path to juice-shop clone (default: current directory)

Options:
  --execute           Actually apply changes (default: dry-run)
  --keep-licenses     Preserve copyright/license headers (default: true)
  --keep-directives   Preserve @ts-ignore, eslint-disable, etc. (default: true)
  --strip-all         Remove ALL comments including licenses and directives
  --help, -h          Show help message
```

### Examples

```bash
# Preview changes in current directory
juice-shop-llm-ready

# Apply changes to a specific path
juice-shop-llm-ready /path/to/juice-shop --execute

# Strip absolutely everything (not recommended for legal compliance)
juice-shop-llm-ready --strip-all --execute

# Use with npx on a fresh clone
git clone https://github.com/juice-shop/juice-shop my-llm-juiceshop
npx juice-shop-llm-ready my-llm-juiceshop --execute
```

## What Gets Removed

| Type | Removed? | Notes |
|------|----------|-------|
| Documentation files | ✅ Yes | README.md, CONTRIBUTING.md, etc. |
| Code comments | ✅ Yes | `//`, `/* */`, `/** */` |
| HTML comments | ✅ Yes | `<!-- -->` |
| YAML comments | ✅ Yes | `#` |
| Copyright headers | ❌ No* | Preserved by default |
| TypeScript directives | ❌ No* | `@ts-expect-error`, etc. |
| ESLint directives | ❌ No* | `eslint-disable`, etc. |

*Unless `--strip-all` is specified

## What Gets Preserved

The following are **always preserved** (application content, not documentation):
- `ftp/*.md` - Challenge files that are part of the application
- `data/static/legal.md` - Application legal page content

## Supported Languages

- TypeScript / JavaScript
- HTML / XML / SVG
- CSS / SCSS / SASS
- YAML
- Python
- Shell / Bash
- Dockerfile
- Pug / Jade
- Handlebars
- Solidity

## Safety Features

The tool includes multiple safety checks:
- ✅ Verifies `package.json` contains `"name": "juice-shop"`
- ✅ Verifies key juice-shop files exist (`server.ts`, `app.ts`, etc.)
- ✅ Refuses to run inside `node_modules`
- ✅ Dry-run by default - must explicitly use `--execute`

## Programmatic Usage

```javascript
const { stripJuiceShop } = require('juice-shop-llm-ready');

stripJuiceShop({
  targetDir: '/path/to/juice-shop',
  execute: true,
  keepLicenses: true,
  keepDirectives: true
});
```

## Stats

When run on Juice Shop v19.x:
- ~140KB of comments removed
- ~200 files modified
- 11 documentation files deleted
- License headers preserved (~60KB)
- Directive comments preserved (~7KB)

## License

MIT

## Related

- [OWASP Juice Shop](https://github.com/juice-shop/juice-shop) - The original vulnerable web application
- [Juice Shop Documentation](https://pwning.owasp-juice.shop/) - Official companion guide

