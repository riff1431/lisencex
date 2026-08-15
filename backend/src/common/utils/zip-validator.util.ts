/**
 * ZIP Package Validator
 *
 * Inspects uploaded ZIP files and validates their structure
 * against the expected layout for each product type.
 *
 * Rules:
 *  - WordPress Plugin: must have a top-level folder with a main .php file
 *  - WordPress Theme:  must have style.css + index.php/functions.php inside
 *  - PHP Script:       must have at least one .php file at any depth
 *  - Next.js App:      must have package.json inside
 *  - Next.js Theme/Plugin: must have package.json inside
 */

import * as unzipper from 'unzipper';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ProductType } from '../enums/app.enums';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  entries: string[];   // Top 100 entry paths for audit
  entryCount: number;
  detectedType?: string;
}

export class ZipPackageValidator {
  /**
   * Validate a ZIP file at `filePath` for the given `productType`.
   * Never throws — always returns a ValidationResult.
   */
  static async validate(filePath: string, productType: ProductType): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: [],
      entries: [],
      entryCount: 0,
    };

    // 1. Confirm file exists and is non-empty
    try {
      const stat = fs.statSync(filePath);
      if (stat.size === 0) {
        result.errors.push('Uploaded file is empty (0 bytes).');
        return result;
      }
      if (stat.size > 500 * 1024 * 1024) {
        result.errors.push('File exceeds maximum allowed size of 500 MB.');
        return result;
      }
    } catch {
      result.errors.push('Cannot read uploaded file from disk.');
      return result;
    }

    // 2. Verify ZIP magic bytes (PK\x03\x04)
    try {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(4);
      fs.readSync(fd, buf, 0, 4, 0);
      fs.closeSync(fd);
      if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
        result.errors.push('File is not a valid ZIP archive (invalid magic bytes).');
        return result;
      }
    } catch {
      result.errors.push('Could not read file header to verify ZIP format.');
      return result;
    }

    // 3. Parse entries
    const allEntries: string[] = [];
    try {
      const directory = await unzipper.Open.file(filePath);
      for (const entry of directory.files) {
        allEntries.push(entry.path);
      }
    } catch (err: any) {
      result.errors.push(`Could not open ZIP archive: ${err.message ?? 'unknown error'}.`);
      return result;
    }

    result.entryCount = allEntries.length;
    result.entries = allEntries.slice(0, 100);

    if (allEntries.length === 0) {
      result.errors.push('ZIP archive is empty — no files found inside.');
      return result;
    }

    // 4. Product-type specific validation
    switch (productType) {
      case ProductType.WORDPRESS_PLUGIN:
        this.validateWordPressPlugin(allEntries, result);
        break;
      case ProductType.WORDPRESS_THEME:
        this.validateWordPressTheme(allEntries, result);
        break;
      case ProductType.PHP_SCRIPT:
        this.validatePhpScript(allEntries, result);
        break;
      case ProductType.NEXTJS_APP:
      case ProductType.NEXTJS_THEME:
      case ProductType.NEXTJS_PLUGIN:
        this.validateNextjsPackage(allEntries, result);
        break;
      default:
        // For SAAS, API, OTHER — just confirm it's a non-empty ZIP
        result.warnings.push(`No structural validation defined for product type "${productType}". Basic ZIP check passed.`);
        result.valid = true;
        break;
    }

    return result;
  }

  // ── WordPress Plugin ──────────────────────────────────────────────────────

  private static validateWordPressPlugin(entries: string[], result: ValidationResult): void {
    const phpFiles = entries.filter(e => e.endsWith('.php'));
    const hasAnyPhp = phpFiles.length > 0;

    if (!hasAnyPhp) {
      result.errors.push('WordPress plugin ZIP must contain at least one PHP file.');
      return;
    }

    // Check for main plugin file (file with Plugin Name: header)
    // We look for a .php file directly inside a top-level folder OR at root level
    const topLevelPhp = phpFiles.filter(e => {
      const parts = e.split('/').filter(Boolean);
      return parts.length <= 2; // root or one folder deep
    });

    if (topLevelPhp.length === 0) {
      result.errors.push('No main PHP file found at the plugin root level or inside a top-level folder.');
      return;
    }

    // Warn if no readme.txt/README.md
    const hasReadme = entries.some(e =>
      e.toLowerCase().endsWith('readme.txt') ||
      e.toLowerCase().endsWith('readme.md'),
    );
    if (!hasReadme) {
      result.warnings.push('No readme.txt or README.md found. Recommended for WordPress plugins.');
    }

    // Warn if no uninstall.php
    const hasUninstall = entries.some(e => e.toLowerCase().endsWith('uninstall.php'));
    if (!hasUninstall) {
      result.warnings.push('No uninstall.php found. Recommended for proper WordPress plugin cleanup.');
    }

    result.valid = true;
  }

  // ── WordPress Theme ───────────────────────────────────────────────────────

  private static validateWordPressTheme(entries: string[], result: ValidationResult): void {
    const hasStyleCss = entries.some(e => e.endsWith('style.css'));
    const hasIndexPhp = entries.some(e => e.endsWith('index.php'));

    if (!hasStyleCss) {
      result.errors.push('WordPress theme ZIP must contain a style.css file with the theme header.');
    }

    if (!hasIndexPhp) {
      result.errors.push('WordPress theme ZIP must contain an index.php file.');
    }

    if (!hasStyleCss || !hasIndexPhp) return;

    // Warn if no functions.php
    const hasFunctions = entries.some(e => e.endsWith('functions.php'));
    if (!hasFunctions) {
      result.warnings.push('No functions.php found. Most WordPress themes require one.');
    }

    // Warn if screenshot missing
    const hasScreenshot = entries.some(e => /screenshot\.(png|jpg|jpeg)$/i.test(e));
    if (!hasScreenshot) {
      result.warnings.push('No screenshot.png found. Required for WordPress.org directory submissions.');
    }

    result.valid = true;
  }

  // ── PHP Script ────────────────────────────────────────────────────────────

  private static validatePhpScript(entries: string[], result: ValidationResult): void {
    const phpFiles = entries.filter(e => e.endsWith('.php'));

    if (phpFiles.length === 0) {
      result.errors.push('PHP script ZIP must contain at least one .php file.');
      return;
    }

    // Warn on suspicious executables
    const dangerous = entries.filter(e =>
      /\.(sh|bat|exe|cmd|ps1)$/i.test(e) && !e.includes('__MACOSX'),
    );
    if (dangerous.length > 0) {
      result.warnings.push(`Potentially dangerous executables found: ${dangerous.slice(0, 5).join(', ')}`);
    }

    result.valid = true;
  }

  // ── Next.js App / Theme / Plugin ──────────────────────────────────────────

  private static validateNextjsPackage(entries: string[], result: ValidationResult): void {
    const hasPackageJson = entries.some(e => {
      const parts = e.split('/').filter(Boolean);
      // Accept package.json at root or one folder deep
      return (parts.length <= 2 && parts[parts.length - 1] === 'package.json');
    });

    if (!hasPackageJson) {
      result.errors.push('Next.js package ZIP must contain a package.json file at the root level or inside a top-level folder.');
      return;
    }

    // Warn on node_modules
    const hasNodeModules = entries.some(e => e.includes('node_modules/'));
    if (hasNodeModules) {
      result.warnings.push('node_modules/ directory found in ZIP. This significantly increases file size. Consider excluding it and running npm install on deployment.');
    }

    // Warn on .next build artifacts
    const hasBuildArtifacts = entries.some(e => e.includes('/.next/') || e.startsWith('.next/'));
    if (hasBuildArtifacts) {
      result.warnings.push('.next/ build directory found in ZIP. This is typically not required in a distributable package.');
    }

    // Check for next.config.js/ts
    const hasNextConfig = entries.some(e =>
      /next\.config\.(js|ts|mjs|cjs)$/.test(e),
    );
    if (!hasNextConfig) {
      result.warnings.push('No next.config.js/ts found. Expected for a Next.js application.');
    }

    result.valid = true;
  }

  // ── Checksum ──────────────────────────────────────────────────────────────

  /**
   * Compute SHA-256 checksum of a file on disk.
   */
  static computeChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash  = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end',  ()    => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}
