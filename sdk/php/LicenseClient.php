<?php
/**
 * LicenseNest Reusable Client SDK for PHP Scripts & Applications
 *
 * Handles activation, cached local validation, offline grace periods,
 * and automatic server heartbeat checks without exposing any private secrets.
 */

class LicenseClient {
    private $apiUrl;
    private $productSlug;
    private $currentVersion;
    private $cacheFile;

    public function __construct(string $apiUrl, string $productSlug, string $currentVersion = '1.0.0', ?string $cacheDir = null) {
        $this->apiUrl = rtrim($apiUrl, '/');
        $this->productSlug = $productSlug;
        $this->currentVersion = $currentVersion;
        $cacheDir = $cacheDir ?? sys_get_temp_dir();
        $this->cacheFile = rtrim($cacheDir, '/') . '/.license_' . md5($productSlug) . '.json';
    }

    /**
     * Get or generate unique installation ID for this server/instance
     */
    public function getInstallationId(): string {
        $file = dirname($this->cacheFile) . '/.inst_id_' . md5($this->productSlug);
        if (file_exists($file)) {
            return trim(file_get_contents($file));
        }
        $id = 'ins_' . bin2hex(random_bytes(8));
        @file_put_contents($file, $id);
        return $id;
    }

    /**
     * Get current server domain
     */
    public function getDomain(): string {
        return $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'localhost';
    }

    /**
     * Activate the product with a License Key or Envato Purchase Code
     */
    public function activate(string $licenseKeyOrPurchaseCode, bool $isPurchaseCode = false): array {
        $payload = [
            'productSlug' => $this->productSlug,
            'installationId' => $this->getInstallationId(),
            'domain' => $this->getDomain(),
            'productVersion' => $this->currentVersion,
        ];

        if ($isPurchaseCode) {
            $payload['purchaseCode'] = trim($licenseKeyOrPurchaseCode);
        } else {
            $payload['licenseKey'] = trim($licenseKeyOrPurchaseCode);
        }

        $res = $this->sendRequest('/public/licenses/activate', $payload);

        if (!empty($res['valid']) && !empty($res['token'])) {
            $this->saveCache($res);
        }

        return $res;
    }

    /**
     * Check if product is active and valid (uses cache, validates on server only when interval expires)
     */
    public function checkLicense(): array {
        $cached = $this->loadCache();
        $now = time();

        // If no token cached, product is inactive
        if (empty($cached) || empty($cached['token'])) {
            return [
                'valid' => false,
                'status' => 'INACTIVE',
                'message' => 'Product is not activated. Please enter a valid license key.',
            ];
        }

        // If cached validation interval is still fresh, return cached result immediately
        if (!empty($cached['cachedUntil']) && strtotime($cached['cachedUntil']) > $now) {
            return [
                'valid' => true,
                'status' => 'ACTIVE',
                'cached' => true,
                'license' => $cached['license'] ?? [],
            ];
        }

        // Validation interval expired -> Perform server heartbeat check
        $payload = [
            'productSlug' => $this->productSlug,
            'installationId' => $this->getInstallationId(),
            'token' => $cached['token'],
            'domain' => $this->getDomain(),
            'productVersion' => $this->currentVersion,
        ];

        try {
            $res = $this->sendRequest('/public/licenses/validate', $payload);

            if (!empty($res['valid'])) {
                // Server confirmed valid -> refresh cache with new token and timestamps
                $cached['token'] = $res['token'] ?? $cached['token'];
                $cached['cachedUntil'] = $res['cachedUntil'] ?? date('c', $now + 86400);
                $cached['gracePeriodUntil'] = $res['gracePeriodUntil'] ?? date('c', $now + 604800);
                $cached['license'] = $res['license'] ?? $cached['license'];
                $this->saveCache($cached);
                return [
                    'valid' => true,
                    'status' => 'ACTIVE',
                    'cached' => false,
                    'license' => $res['license'],
                ];
            } else {
                // Server rejected -> clear cache
                $this->clearCache();
                return $res;
            }
        } catch (Exception $e) {
            // Server unreachable / network timeout -> Check if inside offline grace period
            if (!empty($cached['gracePeriodUntil']) && strtotime($cached['gracePeriodUntil']) > $now) {
                return [
                    'valid' => true,
                    'status' => 'ACTIVE',
                    'grace_period' => true,
                    'message' => 'License server temporarily unreachable. Running under offline grace period.',
                ];
            }

            return [
                'valid' => false,
                'status' => 'GRACE_PERIOD_EXPIRED',
                'message' => 'Offline grace period expired. Please connect to internet to validate license.',
            ];
        }
    }

    /**
     * Deactivate installation and free up activation slot
     */
    public function deactivate(?string $reason = null): array {
        $cached = $this->loadCache();
        $payload = [
            'installationId' => $this->getInstallationId(),
            'token' => $cached['token'] ?? null,
            'domain' => $this->getDomain(),
            'reason' => $reason ?? 'Client application deactivation',
        ];

        $res = $this->sendRequest('/public/licenses/deactivate', $payload);
        $this->clearCache();
        return $res;
    }

    private function sendRequest(string $endpoint, array $data): array {
        $url = $this->apiUrl . $endpoint;
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'User-Agent: LicenseNest-PHP-SDK/' . $this->currentVersion,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("Connection error: $error");
        }

        $json = json_decode($response, true);
        if ($httpCode >= 400) {
            return $json ?? ['valid' => false, 'status' => 'ERROR', 'message' => "HTTP $httpCode"];
        }

        return $json ?? ['valid' => false, 'status' => 'ERROR', 'message' => 'Invalid JSON'];
    }

    private function saveCache(array $data): void {
        @file_put_contents($this->cacheFile, json_encode($data));
    }

    private function loadCache(): ?array {
        if (!file_exists($this->cacheFile)) return null;
        $content = @file_get_contents($this->cacheFile);
        return $content ? json_decode($content, true) : null;
    }

    private function clearCache(): void {
        if (file_exists($this->cacheFile)) {
            @unlink($this->cacheFile);
        }
    }
}
