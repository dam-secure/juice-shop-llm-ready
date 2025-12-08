#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { stripJuiceShop } = require('../lib/stripper');

const args = process.argv.slice(2);

function showHelp() {
  console.log(`
juice-shop-llm-ready - Strip comments from OWASP Juice Shop for LLM consumption

USAGE:
  juice-shop-llm-ready [options] [target-directory]

ARGUMENTS:
  target-directory    Path to juice-shop clone (default: current directory)

OPTIONS:
  --execute           Actually apply changes (default: dry-run)
  --keep-licenses     Preserve copyright/license headers (default: true)
  --keep-directives   Preserve @ts-ignore, eslint-disable, etc. (default: true)
  --strip-all         Remove ALL comments including licenses and directives
  --help, -h          Show this help message

EXAMPLES:
  # Preview changes in current directory
  juice-shop-llm-ready

  # Apply changes to a specific juice-shop clone
  juice-shop-llm-ready /path/to/juice-shop --execute

  # Strip absolutely everything (not recommended)
  juice-shop-llm-ready --strip-all --execute

WORKFLOW:
  1. git clone https://github.com/juice-shop/juice-shop
  2. cd juice-shop
  3. npx juice-shop-llm-ready          # Preview
  4. npx juice-shop-llm-ready --execute # Apply
`);
}

if (args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

const targetDir = args.find(arg => !arg.startsWith('--')) || process.cwd();
const execute = args.includes('--execute');
const stripAll = args.includes('--strip-all');
const keepLicenses = !stripAll && !args.includes('--no-licenses');
const keepDirectives = !stripAll && !args.includes('--no-directives');

const options = {
  targetDir: path.resolve(targetDir),
  execute,
  keepLicenses,
  keepDirectives
};

stripJuiceShop(options);

