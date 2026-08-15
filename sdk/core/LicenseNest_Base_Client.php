<?php
/**
 * LicenseNest Core PHP SDK — Base Client
 *
 * Version: 2.0.0
 *
 * This is the CORE base class shared by all PHP-based product integrations:
 *   - WordPress Plugins
 *   - WordPress Themes
 *   - PHP Scripts / Applications
 *
 * SECURITY MODEL:
 *   - No private signing secrets are stored here or in any distributed product.
 *   - The signed activation token is issued by the server and stored locally.
 *   - All communication uses HTTPS to the LicenseNest API.
 *   - Clients cache the token and only call the server when `cachedUntil` expires.
 *   - If the server is unreachable, the offline grace period keeps the product active.
 *
 * NEVER store ACTIVATION_SECRET, JWT_SECRET, or any server-side key here.
 */

if (!defined('LICENSENEST_SDK_VERSION')) {
    define('LICENSENEST_SDK_VERSION', '2.0.0');
}

abstract class LicenseNest_Base_Client {

    /** @var string LicenseNest API base URL */
    protected string $apiUrl;

    /** @var string Your product slug (e.g. "my-awesome-plugin") */
    protected string $productSlug;

    /** @var string Current version of this product */
    protected string $productVersion;

    /** @var int HTTP request timeout in seconds */
    protected int $timeout = 10;

    // -----------------------------------------------------------------------
    // Abstract Storage — Subclasses implement product-specific storage
    // -----------------------------------------------------------------------

    /** Persist activation cache data (token, cachedUntil, gracePeriodUntil, license) */
    abstract protected function writeCache(array $data): void;

    /** Read persisted activation cache data. Returns null if not stored. */
    abstract protected function readCache(): ?array;

    /** Delete persisted activation cache data */
    abstract protected function deleteCache(): void;

    /** Read/generate a stable unique installation ID for this site */
    abstract protected function getInstallationId(): string;

    /** Get the current site/server domain */
    abstract protected function getDomain(): string;

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    public function __construct(string $apiUrl, string $productSlug, string $productVersion = '1.0.0') {
        $this->apiUrl       = rtrim($apiUrl, '/');
        $this->productSlug  = $productSlug;
        $this->productVersion = $productVersion;
    }

    // -----------------------------------------------------------------------
    // Public API — consistent contract for all product types
    // -----------------------------------------------------------------------

    /**
     * Activate the product using a License Key or Envato Purchase Code.
     *
     * @param string $credential  License key (LIC-XXXX-...) or Envato purchase code (UUID)
     * @param bool   $isPurchaseCode  Pass true for Envato purchase codes
     * @param string|null $installationUrl  Full site URL (optional, improves admin UX)
     * @return array{valid: bool, status: string, token?: string, license?: array, message?: string}
     */
    public function activate(string $credential, bool $isPurchaseCode = false, ?string $installationUrl = null): array {
        $payload = [
            'productSlug'     => $this->productSlug,
            'installationId'  => $this->getInstallationId(),
            'domain'          => $this->getDomain(),
            'productVersion'  => $this->productVersion,
            'installationUrl' => $installationUrl ?? ('https://' . $this->getDomain()),
        ];

        if ($isPurchaseCode) {
            $payload['purchaseCode'] = trim($credential);
        } else {
            $payload['licenseKey'] = strtoupper(trim($credential));
        }

        $response = $this->sendRequest('/public/licenses/activate', $payload);

        if (!empty($response['valid']) && !empty($response['token'])) {
            $this->writeCache($response);
        }

        return $response;
    }

    /**
     * Validate the license. Uses local cache; only contacts server when cachedUntil has elapsed.
     *
     * Call this on plugin/theme boot (not every page load — it self-throttles via cache).
     *
     * @return array{valid: bool, status: string, cached?: bool, grace_period?: bool, license?: array}
     */
    public function validate(): array {
        $cached = $this->readCache();
        $now = time();

        // No token stored → not activated
        if (empty($cached) || empty($cached['token'])) {
            return [
                'valid'   => false,
                'status'  => 'INACTIVE',
                'message' => 'License not activated. Please enter a valid license key.',
            ];
        }

        // Cache still fresh → return without any network call
        if (!empty($cached['cachedUntil']) && strtotime($cached['cachedUntil']) > $now) {
            return [
                'valid'   => true,
                'status'  => 'ACTIVE',
                'cached'  => true,
                'license' => $cached['license'] ?? [],
            ];
        }

        // cachedUntil elapsed → perform server heartbeat
        $payload = [
            'productSlug'    => $this->productSlug,
            'installationId' => $this->getInstallationId(),
            'token'          => $cached['token'],
            'domain'         => $this->getDomain(),
            'productVersion' => $this->productVersion,
        ];

        try {
            $response = $this->sendRequest('/public/licenses/validate', $payload);

            if (!empty($response['valid'])) {
                // Server confirmed valid → refresh cached state
                $cached['token']            = $response['token']            ?? $cached['token'];
                $cached['cachedUntil']      = $response['cachedUntil']      ?? date('c', $now + 86400);
                $cached['gracePeriodUntil'] = $response['gracePeriodUntil'] ?? date('c', $now + 604800);
                $cached['license']          = $response['license']          ?? $cached['license'];
                $this->writeCache($cached);
                return [
                    'valid'   => true,
                    'status'  => 'ACTIVE',
                    'cached'  => false,
                    'license' => $response['license'] ?? [],
                ];
            }

            // Server explicitly rejected → clear cache, block product
            $this->deleteCache();
            return $response;

        } catch (Exception $e) {
            // Network unreachable → check offline grace period
            if (!empty($cached['gracePeriodUntil']) && strtotime($cached['gracePeriodUntil']) > $now) {
                return [
                    'valid'        => true,
                    'status'       => 'ACTIVE',
                    'grace_period' => true,
                    'message'      => 'License server temporarily unreachable. Running under offline grace period until ' . date('Y-m-d', strtotime($cached['gracePeriodUntil'])) . '.',
                ];
            }

            return [
                'valid'   => false,
                'status'  => 'GRACE_PERIOD_EXPIRED',
                'message' => 'Offline grace period has expired. Please connect to the internet and re-validate your license.',
            ];
        }
    }

    /**
     * Get complete license status info (reads cached state, no network call).
     *
     * @return array{activated: bool, licenseKey?: string, status?: string, expiresAt?: string, activationLimit?: int, domain?: string}
     */
    public function getLicenseStatus(): array {
        $cached = $this->readCache();
        if (empty($cached) || empty($cached['token'])) {
            return ['activated' => false];
        }
        return [
            'activated'       => true,
            'licenseKey'      => $cached['license']['licenseKey']      ?? null,
            'status'          => $cached['license']['status']          ?? 'unknown',
            'licenseType'     => $cached['license']['licenseType']     ?? null,
            'expiresAt'       => $cached['license']['expiresAt']       ?? null,
            'supportExpiresAt'=> $cached['license']['supportExpiresAt'] ?? null,
            'activationLimit' => $cached['license']['activationLimit'] ?? null,
            'domain'          => $this->getDomain(),
            'cachedUntil'     => $cached['cachedUntil']                ?? null,
            'gracePeriodUntil'=> $cached['gracePeriodUntil']           ?? null,
        ];
    }

    /**
     * Deactivate this installation and free the activation slot.
     *
     * @param string|null $reason  Optional human-readable deactivation reason
     * @return array{success: bool, message: string}
     */
    public function deactivate(?string $reason = null): array {
        $cached = $this->readCache();

        $payload = [
            'installationId' => $this->getInstallationId(),
            'token'          => $cached['token'] ?? null,
            'domain'         => $this->getDomain(),
            'reason'         => $reason ?? 'User-initiated deactivation',
        ];

        try {
            $response = $this->sendRequest('/public/licenses/deactivate', $payload);
        } catch (Exception $e) {
            $response = ['success' => false, 'message' => 'Network error: ' . $e->getMessage()];
        }

        // Always clear local cache regardless of server response
        $this->deleteCache();
        return $response;
    }

    /**
     * Check if a product update is available.
     *
     * @return array{updateAvailable: bool, latestVersion?: string, downloadUrl?: string, changelog?: string}
     */
    public function checkUpdate(): array {
        $cached = $this->readCache();
        $token  = $cached['token'] ?? '';

        $qs = http_build_query([
            'currentVersion' => $this->productVersion,
            'token'          => $token,
            'domain'         => $this->getDomain(),
        ]);

        $url = $this->apiUrl . '/public/products/' . rawurlencode($this->productSlug) . '/updates?' . $qs;

        try {
            $response = $this->getRequest($url);
            return $response ?? ['updateAvailable' => false];
        } catch (Exception $e) {
            return ['updateAvailable' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Alias for checkUpdate()
     *
     * @return array{updateAvailable: bool, latestVersion?: string, downloadUrl?: string, changelog?: string}
     */
    public function checkForUpdates(): array {
        return $this->checkUpdate();
    }

    // -----------------------------------------------------------------------
    // Protected Helpers
    // -----------------------------------------------------------------------

    /**
     * Send a POST request to the LicenseNest API.
     *
     * @throws Exception on network error
     */
    protected function sendRequest(string $endpoint, array $data): array {
        $url = $this->apiUrl . $endpoint;
        $ch  = curl_init($url);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($data),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Accept: application/json',
                'User-Agent: LicenseNest-PHP-SDK/' . LICENSENEST_SDK_VERSION . ' (' . $this->productSlug . ')',
            ],
            CURLOPT_TIMEOUT        => $this->timeout,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $raw   = curl_exec($ch);
        $code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("cURL error: $error");
        }

        $json = json_decode($raw, true);

        // Unwrap { success, data } envelope if present
        if (is_array($json) && array_key_exists('data', $json) && is_array($json['data'])) {
            return $json['data'];
        }

        if ($code >= 400) {
            return $json ?? ['valid' => false, 'status' => 'ERROR', 'message' => "HTTP $code"];
        }

        return $json ?? ['valid' => false, 'status' => 'ERROR', 'message' => 'Invalid JSON response'];
    }

    /**
     * Send a GET request (used for update checks).
     *
     * @throws Exception on network error
     */
    protected function getRequest(string $url): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPGET        => true,
            CURLOPT_HTTPHEADER     => [
                'Accept: application/json',
                'User-Agent: LicenseNest-PHP-SDK/' . LICENSENEST_SDK_VERSION . ' (' . $this->productSlug . ')',
            ],
            CURLOPT_TIMEOUT        => $this->timeout,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $raw   = curl_exec($ch);
        $code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("cURL error: $error");
        }

        $json = json_decode($raw, true);
        if (is_array($json) && isset($json['data'])) return $json['data'];
        return $json ?? [];
    }
}
