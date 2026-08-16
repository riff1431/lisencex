<?php
/**
 * LicenseNest WordPress Plugin & Theme License Manager
 *
 * Plug-and-play WordPress licensing integration with:
 * - Admin settings page & license key input
 * - Activation / Deactivation hooks
 * - WordPress Transients caching
 * - Daily WP-Cron heartbeat check
 * - Automatic plugin update integration with WordPress Core
 */

if (!defined('ABSPATH')) {
    exit;
}

class LicenseNest_WP_Manager {
    private $apiUrl;
    private $productSlug;
    private $pluginFile;
    private $version;
    private $optionKey;

    public function __construct(string $apiUrl, string $productSlug, string $pluginFile, string $version = '1.0.0') {
        $this->apiUrl = rtrim($apiUrl, '/');
        $this->productSlug = $productSlug;
        $this->pluginFile = $pluginFile;
        $this->version = $version;
        $this->optionKey = 'licensenest_' . sanitize_key($productSlug) . '_data';

        add_action('admin_init', [$this, 'handle_form_actions']);
        add_action('admin_notices', [$this, 'display_admin_notices']);
        add_action('licensenest_heartbeat_' . sanitize_key($productSlug), [$this, 'cron_heartbeat_check']);
        add_action('init', [$this, 'handle_remote_revalidate']);

        if (!wp_next_scheduled('licensenest_heartbeat_' . sanitize_key($productSlug))) {
            wp_schedule_event(time(), 'daily', 'licensenest_heartbeat_' . sanitize_key($productSlug));
        }
    }

    public function get_installation_id(): string {
        $id = get_option('licensenest_inst_id_' . $this->productSlug);
        if (!$id) {
            $id = 'ins_wp_' . wp_generate_password(12, false);
            update_option('licensenest_inst_id_' . $this->productSlug, $id);
        }
        return $id;
    }

    public function get_domain(): string {
        $url = home_url();
        $host = parse_url($url, PHP_URL_HOST);
        return $host ?: 'localhost';
    }

    public function is_active(): bool {
        $cached = get_transient('licensenest_status_' . $this->productSlug);
        if ($cached === 'active') {
            return true;
        }

        $data = get_option($this->optionKey);
        if (empty($data['token'])) {
            return false;
        }

        // Check if cached offline grace period is valid
        if (!empty($data['gracePeriodUntil']) && strtotime($data['gracePeriodUntil']) > time()) {
            set_transient('licensenest_status_' . $this->productSlug, 'active', 3600);
            return true;
        }

        return false;
    }

    public function activate(string $license_key): array {
        $payload = [
            'productSlug' => $this->productSlug,
            'licenseKey' => trim($license_key),
            'installationId' => $this->get_installation_id(),
            'domain' => $this->get_domain(),
            'installationUrl' => home_url(),
            'productVersion' => $this->version,
            'sdkVersion' => '1.0.0',
            'sdkType' => 'wordpress',
        ];

        $response = wp_remote_post($this->apiUrl . '/public/licenses/activate', [
            'headers' => ['Content-Type' => 'application/json'],
            'body' => wp_json_encode($payload),
            'timeout' => 15,
        ]);

        if (is_wp_error($response)) {
            return ['valid' => false, 'message' => $response->get_error_message()];
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!empty($body['valid']) && !empty($body['token'])) {
            update_option($this->optionKey, [
                'licenseKey' => $license_key,
                'token' => $body['token'],
                'cachedUntil' => $body['cachedUntil'],
                'gracePeriodUntil' => $body['gracePeriodUntil'],
                'license' => $body['license'] ?? [],
                'sdkWarning' => $body['sdkWarning'] ?? null,
            ]);
            set_transient('licensenest_status_' . $this->productSlug, 'active', 86400);
        }

        return $body;
    }

    public function deactivate(): array {
        $data = get_option($this->optionKey);
        $payload = [
            'installationId' => $this->get_installation_id(),
            'token' => $data['token'] ?? null,
            'domain' => $this->get_domain(),
            'reason' => 'WordPress plugin deactivation',
        ];

        wp_remote_post($this->apiUrl . '/public/licenses/deactivate', [
            'headers' => ['Content-Type' => 'application/json'],
            'body' => wp_json_encode($payload),
            'timeout' => 15,
        ]);

        delete_option($this->optionKey);
        delete_transient('licensenest_status_' . $this->productSlug);

        return ['success' => true];
    }

    public function cron_heartbeat_check(): void {
        $data = get_option($this->optionKey);
        if (empty($data['token'])) return;

        $payload = [
            'productSlug' => $this->productSlug,
            'installationId' => $this->get_installation_id(),
            'token' => $data['token'],
            'domain' => $this->get_domain(),
            'productVersion' => $this->version,
            'sdkVersion' => '1.0.0',
            'sdkType' => 'wordpress',
        ];

        $response = wp_remote_post($this->apiUrl . '/public/licenses/validate', [
            'headers' => ['Content-Type' => 'application/json'],
            'body' => wp_json_encode($payload),
            'timeout' => 15,
        ]);

        if (!is_wp_error($response)) {
            $body = json_decode(wp_remote_retrieve_body($response), true);
            if (!empty($body['valid'])) {
                $data['token'] = $body['token'] ?? $data['token'];
                $data['cachedUntil'] = $body['cachedUntil'] ?? $data['cachedUntil'];
                $data['gracePeriodUntil'] = $body['gracePeriodUntil'] ?? $data['gracePeriodUntil'];
                $data['sdkWarning'] = $body['sdkWarning'] ?? null;
                update_option($this->optionKey, $data);
                set_transient('licensenest_status_' . $this->productSlug, 'active', 86400);
            } else {
                delete_transient('licensenest_status_' . $this->productSlug);
            }
        }
    }

    public function handle_form_actions(): void {
        if (!isset($_POST['licensenest_nonce']) || !wp_verify_nonce($_POST['licensenest_nonce'], 'licensenest_save_' . $this->productSlug)) {
            return;
        }

        if (isset($_POST['licensenest_activate'])) {
            $key = sanitize_text_field($_POST['license_key'] ?? '');
            $res = $this->activate($key);
            if (!empty($res['valid'])) {
                add_settings_error('licensenest_messages', 'license_active', 'License successfully activated!', 'updated');
            } else {
                add_settings_error('licensenest_messages', 'license_error', $res['message'] ?? 'Activation failed', 'error');
            }
        } elseif (isset($_POST['licensenest_deactivate'])) {
            $this->deactivate();
            add_settings_error('licensenest_messages', 'license_deactivated', 'License deactivated and slot released.', 'updated');
        }
    }

    public function display_admin_notices(): void {
        $data = get_option($this->optionKey);
        if (!empty($data['sdkWarning'])) {
            ?>
            <div class="notice notice-warning is-dismissible">
                <p><strong><?php echo esc_html($this->productSlug); ?> SDK Warning:</strong> <?php echo esc_html($data['sdkWarning']); ?></p>
            </div>
            <?php
        }

        if (!$this->is_active()) {
            $screen = get_current_screen();
            if ($screen && strpos($screen->id, $this->productSlug) === false) {
                ?>
                <div class="notice notice-warning is-dismissible">
                    <p><strong><?php echo esc_html($this->productSlug); ?>:</strong> Please <a href="<?php echo esc_url(admin_url('admin.php?page=' . $this->productSlug . '-license')); ?>">activate your license key</a> to receive automatic updates and unlock all pro features.</p>
                </div>
                <?php
            }
        }
    }

    public function handle_remote_revalidate(): void {
        if (isset($_GET['licensenest_revalidate']) && isset($_GET['activation_id'])) {
            $activation_id = sanitize_text_field($_GET['activation_id']);
            $data = get_option($this->optionKey);
            if (!empty($data['token'])) {
                $sig = $_GET['sig'] ?? '';
                $expected_sig = hash_hmac('sha256', $activation_id, $data['token']);
                if (hash_equals($expected_sig, $sig)) {
                    delete_transient('licensenest_status_' . $this->productSlug);
                    $data['cachedUntil'] = date('c', time() - 3600); // Set cache to expired
                    update_option($this->optionKey, $data);
                    
                    // Immediately revalidate
                    $this->cron_heartbeat_check();
                    
                    wp_send_json_success(['message' => 'Revalidated successfully']);
                }
            }
            wp_send_json_error(['message' => 'Unauthorized'], 401);
        }
    }
}
