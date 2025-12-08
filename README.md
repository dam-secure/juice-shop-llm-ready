# juice-shop-llm-ready

Strip comments and documentation from [OWASP Juice Shop](https://github.com/juice-shop/juice-shop) for LLM-friendly code analysis.

## Quick Start

```bash
# Clone juice-shop to a sibling directory
gh repo clone juice-shop/juice-shop ../juice-shop

# Preview what will be stripped
npx juice-shop-llm-ready ../juice-shop

# Apply changes
npx juice-shop-llm-ready ../juice-shop --execute
```

## Options

```
npx juice-shop-llm-ready [target-directory] [options]

--execute       Apply changes (default: dry-run preview)
--strip-all     Remove ALL comments including licenses and directives
--help          Show help
```

By default, license headers and linter directives (`@ts-ignore`, `eslint-disable`, etc.) are preserved.

## License

MIT
