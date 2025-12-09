const fs = require('fs');
const path = require('path');

const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  'build',
  'dist',
  'frontend/node_modules',
  'frontend/dist'
];

const PRESERVED_MD_FILES = [
  'ftp/acquisitions.md',
  'ftp/announcement_encrypted.md',
  'ftp/coupons_2013.md.bak',
  'ftp/legal.md',
  'data/static/legal.md'
];

const DOCS_TO_DELETE = [
  'README.md',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'HALL_OF_FAME.md',
  'REFERENCES.md',
  'SECURITY.md',
  'SOLUTIONS.md',
  '.github/ISSUE_TEMPLATE/bug-report.md',
  '.github/ISSUE_TEMPLATE/challenge-idea.md',
  '.github/ISSUE_TEMPLATE/feature-request.md',
  '.github/PULL_REQUEST_TEMPLATE.md'
];

const DIRECTIVE_PATTERNS = [
  'jslint',
  '@ts-expect-error',
  '@ts-ignore',
  '@ts-nocheck',
  '@ts-check',
  'eslint-disable',
  'eslint-enable',
  'prettier-ignore',
  'istanbul ignore',
  'c8 ignore',
  'webpack',
  'webpackChunkName',
  '@jsx',
  '@jsxImportSource',
  '@refresh',
  'noinspection',
  '@vue',
  '# sourceMappingURL',
  '@ sourceMappingURL'
];

// Functional directives that must be preserved exactly as-is (content matters)
const PRESERVE_VERBATIM_PATTERNS = [
  'webpack',
  'webpackChunkName',
  '@jsx',
  '@jsxImportSource',
  '@vue',
  '# sourceMappingURL',
  '@ sourceMappingURL'
];

const LICENSE_PATTERNS = [
  'copyright',
  'spdx-license-identifier',
  'license',
  '(c)',
  'licensed under',
  'all rights reserved',
  'permission is hereby granted',
  'mit license',
  'apache license',
  'bsd license',
  'gpl',
  'lgpl',
  'mozilla public license'
];

let OPTIONS = {
  keepLicenses: true,
  keepDirectives: true
};

function isDirectiveComment(commentText) {
  if (!OPTIONS.keepDirectives) return false;
  const trimmed = commentText.trim();
  return DIRECTIVE_PATTERNS.some(pattern => trimmed.startsWith(pattern));
}

function isLicenseComment(commentText) {
  if (!OPTIONS.keepLicenses) return false;
  const lower = commentText.toLowerCase();
  return LICENSE_PATTERNS.some(pattern => lower.includes(pattern));
}

function shouldPreserveComment(commentText) {
  return isDirectiveComment(commentText) || isLicenseComment(commentText);
}

function processCommentContent(commentText) {
  // Check for license comments first - keep them as-is
  if (isLicenseComment(commentText)) {
    return commentText;
  }
  
  // Check for directive comments
  if (OPTIONS.keepDirectives) {
    const trimmed = commentText.trim();
    for (const pattern of DIRECTIVE_PATTERNS) {
      if (trimmed.startsWith(pattern)) {
        // Functional directives (webpack, jsx, etc.) must be preserved exactly
        if (PRESERVE_VERBATIM_PATTERNS.some(p => trimmed.startsWith(p))) {
          return commentText;
        }
        // Hint/suppressor directives can be shortened
        const leadingWhitespace = commentText.match(/^\s*/)[0];
        return leadingWhitespace + pattern + ' comment removed';
      }
    }
  }
  
  // Not a preserved comment - remove it
  return null;
}

function stripJsComments(content) {
  let result = '';
  let i = 0;
  const len = content.length;
  
  while (i < len) {
    if (content[i] === '"' || content[i] === "'" || content[i] === '`') {
      const quote = content[i];
      result += content[i++];
      
      while (i < len && content[i] !== quote) {
        if (content[i] === '\\' && i + 1 < len) {
          result += content[i++];
          if (i < len) result += content[i++];
        } else {
          if (quote === '`' && content[i] === '$' && content[i + 1] === '{') {
            let braceCount = 1;
            result += content[i++];
            result += content[i++];
            while (i < len && braceCount > 0) {
              if (content[i] === '{') braceCount++;
              else if (content[i] === '}') braceCount--;
              result += content[i++];
            }
          } else {
            result += content[i++];
          }
        }
      }
      if (i < len) result += content[i++];
    }
    else if (content[i] === '/' && i + 1 < len) {
      const prevNonSpace = result.trimEnd().slice(-1);
      const isRegexContext = /[=(:,;\[!&|?{}\n]/.test(prevNonSpace) || prevNonSpace === '' || 
                            result.trimEnd().endsWith('return') || 
                            result.trimEnd().endsWith('typeof');
      
      if (content[i + 1] === '/') {
        const commentStart = i;
        i += 2;
        let commentText = '';
        while (i < len && content[i] !== '\n') {
          commentText += content[i++];
        }
        const processed = processCommentContent(commentText);
        if (processed !== null) {
          result += '//' + processed;
        }
        if (i < len) result += content[i++];
      } else if (content[i + 1] === '*') {
        const commentStart = i;
        i += 2;
        let commentText = '';
        while (i < len - 1 && !(content[i] === '*' && content[i + 1] === '/')) {
          commentText += content[i++];
        }
        i += 2;
        const processed = processCommentContent(commentText);
        if (processed !== null) {
          // Ensure space before closing */ for readability
          const suffix = processed.endsWith(' ') ? '' : ' ';
          result += '/*' + processed + suffix + '*/';
        } else if (result.length > 0 && !/\s$/.test(result)) {
          result += ' ';
        }
      } else if (isRegexContext && content[i + 1] !== '=') {
        result += content[i++];
        while (i < len && content[i] !== '/') {
          if (content[i] === '\\' && i + 1 < len) {
            result += content[i++];
            if (i < len) result += content[i++];
          } else if (content[i] === '[') {
            result += content[i++];
            while (i < len && content[i] !== ']') {
              if (content[i] === '\\' && i + 1 < len) {
                result += content[i++];
                if (i < len) result += content[i++];
              } else {
                result += content[i++];
              }
            }
            if (i < len) result += content[i++];
          } else {
            result += content[i++];
          }
        }
        if (i < len) result += content[i++];
        while (i < len && /[gimsuy]/.test(content[i])) {
          result += content[i++];
        }
      } else {
        result += content[i++];
      }
    } else {
      result += content[i++];
    }
  }
  
  return result;
}

function stripCssComments(content, isScss = false) {
  let result = '';
  let i = 0;
  const len = content.length;
  
  while (i < len) {
    if (content[i] === '"' || content[i] === "'") {
      const quote = content[i];
      result += content[i++];
      while (i < len && content[i] !== quote) {
        if (content[i] === '\\' && i + 1 < len) {
          result += content[i++];
          if (i < len) result += content[i++];
        } else {
          result += content[i++];
        }
      }
      if (i < len) result += content[i++];
    }
    else if (content[i] === '/') {
      if (content[i + 1] === '*') {
        const commentStart = i;
        i += 2;
        let commentText = '';
        while (i < len - 1 && !(content[i] === '*' && content[i + 1] === '/')) {
          commentText += content[i++];
        }
        i += 2;
        if (isLicenseComment(commentText)) {
          result += content.substring(commentStart, i);
        }
      } else if (isScss && content[i + 1] === '/') {
        const commentStart = i;
        i += 2;
        let commentText = '';
        while (i < len && content[i] !== '\n') {
          commentText += content[i++];
        }
        if (isLicenseComment(commentText)) {
          result += content.substring(commentStart, i);
        }
        if (i < len) result += content[i++];
      } else {
        result += content[i++];
      }
    } else {
      result += content[i++];
    }
  }
  
  return result;
}

function stripHtmlComments(content) {
  return content.replace(/<!--[\s\S]*?-->/g, (match) => {
    const commentText = match.slice(4, -3);
    return isLicenseComment(commentText) ? match : '';
  });
}

function stripYamlComments(content) {
  const lines = content.split('\n');
  const result = [];
  
  for (const line of lines) {
    let inString = false;
    let stringChar = '';
    let newLine = '';
    let commentStart = -1;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        newLine += char;
      } else if (inString && char === stringChar && line[i - 1] !== '\\') {
        inString = false;
        newLine += char;
      } else if (!inString && char === '#') {
        commentStart = i;
        break;
      } else {
        newLine += char;
      }
    }
    
    if (commentStart !== -1) {
      const commentText = line.substring(commentStart + 1);
      const processed = processCommentContent(commentText);
      if (processed !== null) {
        result.push(newLine + '#' + processed);
      } else {
        result.push(newLine.trimEnd());
      }
    } else {
      result.push(newLine.trimEnd());
    }
  }
  
  return result.join('\n');
}

function stripPythonComments(content) {
  let result = '';
  let i = 0;
  const len = content.length;
  
  while (i < len) {
    if ((content.substring(i, i + 3) === '"""' || content.substring(i, i + 3) === "'''")) {
      const quote = content.substring(i, i + 3);
      const beforeContent = result.trimEnd();
      const isDocstring = beforeContent.endsWith(':') || 
                         beforeContent === '' || 
                         /^\s*$/.test(result.split('\n').pop());
      
      if (isDocstring) {
        i += 3;
        while (i < len - 2 && content.substring(i, i + 3) !== quote) i++;
        i += 3;
      } else {
        result += content.substring(i, i + 3);
        i += 3;
        while (i < len - 2 && content.substring(i, i + 3) !== quote) {
          result += content[i++];
        }
        if (i < len - 2) {
          result += content.substring(i, i + 3);
          i += 3;
        }
      }
    }
    else if (content[i] === '"' || content[i] === "'") {
      const quote = content[i];
      result += content[i++];
      while (i < len && content[i] !== quote) {
        if (content[i] === '\\' && i + 1 < len) {
          result += content[i++];
          if (i < len) result += content[i++];
        } else {
          result += content[i++];
        }
      }
      if (i < len) result += content[i++];
    }
    else if (content[i] === '#') {
      i++; // skip the #
      let commentText = '';
      while (i < len && content[i] !== '\n') {
        commentText += content[i++];
      }
      const processed = processCommentContent(commentText);
      if (processed !== null) {
        result += '#' + processed;
      }
      if (i < len) result += content[i++];
    } else {
      result += content[i++];
    }
  }
  
  return result;
}

function stripShellComments(content) {
  const lines = content.split('\n');
  const result = [];
  
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    
    if (idx === 0 && line.startsWith('#!')) {
      result.push(line);
      continue;
    }
    
    let inString = false;
    let stringChar = '';
    let newLine = '';
    let commentStart = -1;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        newLine += char;
      } else if (inString && char === stringChar && line[i - 1] !== '\\') {
        inString = false;
        newLine += char;
      } else if (!inString && char === '#') {
        commentStart = i;
        break;
      } else {
        newLine += char;
      }
    }
    
    if (commentStart !== -1) {
      const commentText = line.substring(commentStart + 1);
      const processed = processCommentContent(commentText);
      if (processed !== null) {
        result.push(newLine + '#' + processed);
      } else {
        result.push(newLine.trimEnd());
      }
    } else {
      result.push(newLine.trimEnd());
    }
  }
  
  return result.join('\n');
}

function stripPugComments(content) {
  const lines = content.split('\n');
  const result = [];
  let inBlockComment = false;
  let blockCommentIndent = 0;
  
  for (const line of lines) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;
    
    if (inBlockComment) {
      if (trimmed.length > 0 && indent <= blockCommentIndent) {
        inBlockComment = false;
      } else {
        continue;
      }
    }
    
    if (trimmed.startsWith('//-') || trimmed.startsWith('//')) {
      const commentContent = trimmed.startsWith('//-') ? trimmed.slice(3) : trimmed.slice(2);
      if (commentContent.trim() === '') {
        inBlockComment = true;
        blockCommentIndent = indent;
      }
      continue;
    }
    
    result.push(line);
  }
  
  return result.join('\n');
}

function stripHandlebarsComments(content) {
  content = content.replace(/\{\{!--[\s\S]*?--\}\}/g, '');
  content = content.replace(/\{\{![\s\S]*?\}\}/g, '');
  return content;
}

function getFileExtension(filePath) {
  const basename = path.basename(filePath);
  if (basename === 'Dockerfile') return 'dockerfile';
  if (basename === 'Vagrantfile') return 'vagrantfile';
  const ext = path.extname(filePath).toLowerCase();
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

function processFile(filePath, content) {
  const ext = getFileExtension(filePath);
  
  switch (ext) {
    case 'ts':
    case 'js':
    case 'mjs':
    case 'cjs':
    case 'jsx':
    case 'tsx':
    case 'sol':
      return stripJsComments(content);
    
    case 'css':
      return stripCssComments(content, false);
    
    case 'scss':
    case 'sass':
    case 'less':
      return stripCssComments(content, true);
    
    case 'html':
    case 'htm':
    case 'xml':
    case 'svg':
      return stripHtmlComments(content);
    
    case 'yml':
    case 'yaml':
      return stripYamlComments(content);
    
    case 'py':
      return stripPythonComments(content);
    
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'dockerfile':
      return stripShellComments(content);
    
    case 'pug':
    case 'jade':
      return stripPugComments(content);
    
    case 'hbs':
    case 'handlebars':
      return stripHandlebarsComments(content);
    
    default:
      return null;
  }
}

function shouldExclude(filePath, baseDir) {
  const relativePath = path.relative(baseDir, filePath);
  
  for (const excluded of EXCLUDED_DIRS) {
    if (relativePath.startsWith(excluded + path.sep) || relativePath === excluded) {
      return true;
    }
  }
  
  const segments = relativePath.split(path.sep);
  for (const segment of segments) {
    if (EXCLUDED_DIRS.includes(segment)) {
      return true;
    }
  }
  
  return false;
}

function getAllFiles(dir, baseDir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (shouldExclude(fullPath, baseDir)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      getAllFiles(fullPath, baseDir, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function verifySafeToRun(targetDir) {
  console.log('Running safety checks...\n');
  
  const pkgPath = path.join(targetDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error('ERROR: No package.json found. Is this a juice-shop directory?');
    console.error(`Target directory: ${targetDir}`);
    process.exit(1);
  }
  
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.name !== 'juice-shop') {
    console.error(`ERROR: This is not juice-shop (found: "${pkg.name}")`);
    console.error('This tool only works with OWASP Juice Shop.');
    process.exit(1);
  }
  console.log('  ✓ package.json confirms this is juice-shop');
  
  const requiredFiles = ['server.ts', 'app.ts', 'frontend/angular.json'];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(targetDir, file))) {
      console.error(`ERROR: Missing expected file: ${file}`);
      console.error('This does not appear to be a valid juice-shop repository.');
      process.exit(1);
    }
  }
  console.log('  ✓ Key juice-shop files verified');
  
  if (targetDir.includes('node_modules')) {
    console.error('ERROR: Cannot run on a path inside node_modules!');
    process.exit(1);
  }
  console.log('  ✓ Path validation passed');
  
  console.log('\n✓ All safety checks passed\n');
  console.log(`  Target: ${targetDir}\n`);
}

function stripJuiceShop(options) {
  const { targetDir, execute, keepLicenses, keepDirectives } = options;
  
  OPTIONS.keepLicenses = keepLicenses;
  OPTIONS.keepDirectives = keepDirectives;
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         JUICE SHOP LLM-READY                                   ║');
  console.log('║         Strip comments for LLM consumption                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  verifySafeToRun(targetDir);
  
  const dryRun = !execute;
  
  if (dryRun) {
    console.log('MODE: DRY RUN (no changes will be made)');
    console.log('To actually make changes, add: --execute\n');
  } else {
    console.log('MODE: EXECUTE (changes will be written to disk)\n');
  }
  
  console.log(`OPTIONS:`);
  console.log(`  Keep license headers: ${keepLicenses}`);
  console.log(`  Keep directive comments: ${keepDirectives}\n`);
  
  const stats = {
    filesProcessed: 0,
    filesModified: 0,
    bytesRemoved: 0,
    docsDeleted: 0,
    errors: []
  };
  
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('PHASE 1: Deleting documentation files');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  for (const docFile of DOCS_TO_DELETE) {
    const fullPath = path.join(targetDir, docFile);
    if (fs.existsSync(fullPath)) {
      console.log(`  DELETE: ${docFile}`);
      if (!dryRun) {
        try {
          fs.unlinkSync(fullPath);
          stats.docsDeleted++;
        } catch (err) {
          stats.errors.push(`Failed to delete ${docFile}: ${err.message}`);
        }
      } else {
        stats.docsDeleted++;
      }
    }
  }
  
  console.log(`\n  Total documentation files to delete: ${stats.docsDeleted}\n`);
  
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('PHASE 2: Stripping comments from source files');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const files = getAllFiles(targetDir, targetDir);
  const modifiedFiles = [];
  
  for (const filePath of files) {
    const relativePath = path.relative(targetDir, filePath);
    
    if (PRESERVED_MD_FILES.some(p => relativePath === p || relativePath.endsWith(p))) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const processed = processFile(filePath, content);
      
      if (processed === null) {
        continue;
      }
      
      stats.filesProcessed++;
      
      if (processed !== content) {
        const bytesRemoved = content.length - processed.length;
        stats.filesModified++;
        stats.bytesRemoved += bytesRemoved;
        modifiedFiles.push({ path: relativePath, bytesRemoved });
        
        if (!dryRun) {
          fs.writeFileSync(filePath, processed, 'utf8');
        }
      }
    } catch (err) {
      stats.errors.push(`Error processing ${relativePath}: ${err.message}`);
    }
  }
  
  if (modifiedFiles.length > 0) {
    console.log('Files with comments removed:\n');
    for (const file of modifiedFiles) {
      console.log(`  ${file.path} (-${file.bytesRemoved} bytes)`);
    }
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  console.log(`  Documentation files deleted: ${stats.docsDeleted}`);
  console.log(`  Source files processed: ${stats.filesProcessed}`);
  console.log(`  Source files modified: ${stats.filesModified}`);
  console.log(`  Total bytes removed: ${stats.bytesRemoved.toLocaleString()}`);
  
  if (stats.errors.length > 0) {
    console.log(`\n  Errors encountered: ${stats.errors.length}`);
    for (const err of stats.errors) {
      console.log(`    - ${err}`);
    }
  }
  
  console.log('');
  
  if (dryRun) {
    console.log('This was a DRY RUN. No files were modified.');
    console.log('To apply changes, add: --execute');
  } else {
    console.log('All changes have been applied.');
    console.log('Your juice-shop is now LLM-ready! 🤖');
  }
  
  console.log('');
  
  return stats;
}

module.exports = { stripJuiceShop };

