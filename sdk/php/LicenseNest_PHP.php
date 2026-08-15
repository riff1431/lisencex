<?php
/**
 * LicenseNest — PHP Script / Application Integration
 *
 * Use this for any generic PHP product that is not WordPress-based:
 *   - SaaS scripts (PHP billing tools, CRM, etc.)
 *   - CodeIgniter / Laravel / Symfony apps distributed as products
 *   - Standalone PHP tools and utilities
 *
 * USAGE:
 *
 *   require_once __DIR__ . '/includes/LicenseNest.php';
 *
 *   $license = new LicenseNest_PHP(
 *       'https://your-licensenest-api.com/api/v1',
 *       'your-script-slug',
 *       '2.4.1',
 *       __DIR__ . '/storage'   // writable directory for cache storage
 *   );
 *
 *   // Check on every request (self-throttled via file cache)
 *   $status = $license->validate();
 *   if (!$status['valid']) {
 *       die('License inactive: ' . $status['message']);
 *   }
 */

require_once __DIR__ . '/../core/LicenseNest_Base_Client.php';

class LicenseNest_PHP extends LicenseNest_Base_Client {

    /** @var string Directory used to store cache and installation ID files */
    private string $storageDir;

    private string $cacheFile;
    private string $instFile;

    public function __construct(
        string $apiUrl,
        string $productSlug,
        string $productVersion = '1.0.0',
        ?string $storageDir = null
    ) {
        parent::__construct($apiUrl, $productSlug, $productVersion);

        $this->storageDir = rtrim($storageDir ?? sys_get_temp_dir(), '/');
        $slug             = md5($productSlug);
        $this->cacheFile  = $this->storageDir . '/.ln_cache_' . $slug . '.json';
        $this->instFile   = $this->storageDir . '/.ln_inst_' . $slug;
    }

    // ─── LicenseNest_Base_Client Implementation ──────────────────────────────

    protected function writeCache(array $data): void {
        $this->ensureStorageDir();
        @file_put_contents($this->cacheFile, json_encode($data, JSON_PRETTY_PRINT));
    }

    protected function readCache(): ?array {
        if (!file_exists($this->cacheFile)) return null;
        $raw = @file_get_contents($this->cacheFile);
        return $raw ? json_decode($raw, true) : null;
    }

    protected function deleteCache(): void {
        if (file_exists($this->cacheFile)) @unlink($this->cacheFile);
    }

    protected function getInstallationId(): string {
        if (file_exists($this->instFile)) {
            return trim(@file_get_contents($this->instFile));
        }
        $this->ensureStorageDir();
        $id = 'ins_php_' . bin2hex(random_bytes(8));
        @file_put_contents($this->instFile, $id);
        return $id;
    }

    protected function getDomain(): string {
        if (!empty($_SERVER['HTTP_HOST'])) {
            return strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST']));
        }
        if (!empty($_SERVER['SERVER_NAME'])) {
            return strtolower($_SERVER['SERVER_NAME']);
        }
        // CLI or background process — fall back to hostname
        return gethostname() ?: 'localhost';
    }

    // ─── PHP-specific: environment detection ─────────────────────────────────

    /**
     * Auto-detect whether this is production, staging, or localhost.
     */
    public function detectEnvironment(): string {
        $domain = $this->getDomain();

        if (in_array($domain, ['localhost', '127.0.0.1', '::1'], true)) {
            return 'localhost';
        }

        if (
            str_contains($domain, 'staging') ||
            str_contains($domain, 'stage') ||
            str_contains($domain, 'dev.') ||
            str_contains($domain, '.local')
        ) {
            return 'staging';
        }

        return 'production';
    }

    /**
     * Get cache file path (useful for debugging)
     */
    public function getCacheFilePath(): string {
        return $this->cacheFile;
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private function ensureStorageDir(): void {
        if (!is_dir($this->storageDir)) {
            @mkdir($this->storageDir, 0755, true);
        }

        // Write .htaccess to protect cache files on Apache servers
        $htaccess = $this->storageDir . '/.htaccess';
        if (!file_exists($htaccess)) {
            @file_put_contents($htaccess, "Deny from all\n");
        }
    }
}
