<?php
/**
 * LicenseNest — WordPress Plugin Integration
 *
 * Drop this file into your plugin's root directory (or an `includes/` subfolder).
 * Requires: LicenseNest_Base_Client.php
 *
 * USAGE in your plugin's main .php file:
 *
 *   require_once __DIR__ . '/includes/class-licensenest-plugin.php';
 *
 *   $license = new LicenseNest_Plugin_License(
 *       'https://your-licensenest-api.com/api/v1',
 *       'your-plugin-slug',
 *       MY_PLUGIN_VERSION,
 *       __FILE__
 *   );
 *
 *   // Register admin settings page
 *   $license->register();
 *
 *   // Gate premium features:
 *   if ($license->isActive()) { ... }
 */

if (!defined('ABSPATH')) exit;

require_once __DIR__ . '/../core/LicenseNest_Base_Client.php';

class LicenseNest_Plugin_License extends LicenseNest_Base_Client {

    /** @var string Path to the main plugin file */
    private string $pluginFile;

    /** @var string WordPress option key prefix */
    private string $optionPrefix;

    /** @var string Transient key for license status cache */
    private string $transientKey;

    /** @var string Settings page slug */
    private string $pageSlug;

    public function __construct(
        string $apiUrl,
        string $productSlug,
        string $productVersion,
        string $pluginFile
    ) {
        parent::__construct($apiUrl, $productSlug, $productVersion);
        $this->pluginFile   = $pluginFile;
        $this->optionPrefix = 'ln_plugin_' . sanitize_key($productSlug) . '_';
        $this->transientKey = 'ln_status_' . sanitize_key($productSlug);
        $this->pageSlug     = sanitize_key($productSlug) . '-license';
    }

    // ─── LicenseNest_Base_Client Implementation ──────────────────────────────

    protected function writeCache(array $data): void {
        update_option($this->optionPrefix . 'cache', $data, false);
        set_transient($this->transientKey, 'active', $this->getTransientExpiry($data));
    }

    protected function readCache(): ?array {
        $data = get_option($this->optionPrefix . 'cache');
        return is_array($data) ? $data : null;
    }

    protected function deleteCache(): void {
        delete_option($this->optionPrefix . 'cache');
        delete_transient($this->transientKey);
    }

    protected function getInstallationId(): string {
        $id = get_option($this->optionPrefix . 'inst_id');
        if (!$id) {
            $id = 'ins_wp_' . wp_generate_password(16, false);
            update_option($this->optionPrefix . 'inst_id', $id, false);
        }
        return $id;
    }

    protected function getDomain(): string {
        $host = parse_url(home_url(), PHP_URL_HOST);
        return $host ?: 'localhost';
    }

    // ─── WordPress-specific helpers ──────────────────────────────────────────

    /**
     * Is the license currently active? (Transient-cached, no server call)
     */
    public function isActive(): bool {
        // Fast path: transient cache
        if (get_transient($this->transientKey) === 'active') return true;

        $cached = $this->readCache();
        if (empty($cached['token'])) return false;

        $now = time();
        // Within offline grace period?
        if (!empty($cached['gracePeriodUntil']) && strtotime($cached['gracePeriodUntil']) > $now) {
            return true;
        }
        return false;
    }

    /**
     * Register WordPress hooks: admin page, save handler, cron heartbeat.
     */
    public function register(): void {
        add_action('admin_menu',            [$this, 'addAdminPage']);
        add_action('admin_init',            [$this, 'handleFormSubmit']);
        add_action('admin_notices',         [$this, 'showAdminNotice']);
        add_filter('plugin_action_links_' . plugin_basename($this->pluginFile), [$this, 'addPluginActionLinks']);

        // Register & schedule WP-Cron heartbeat
        add_action('ln_cron_' . sanitize_key($this->productSlug), [$this, 'cronHeartbeat']);
        if (!wp_next_scheduled('ln_cron_' . sanitize_key($this->productSlug))) {
            wp_schedule_event(time(), 'daily', 'ln_cron_' . sanitize_key($this->productSlug));
        }

        // Register automatic update integration
        add_filter('pre_set_site_transient_update_plugins', [$this, 'checkForUpdate']);
        add_filter('plugins_api', [$this, 'pluginInfo'], 20, 3);
    }

    /**
     * Add License Settings page under Settings menu
     */
    public function addAdminPage(): void {
        add_options_page(
            'License — ' . ucwords(str_replace('-', ' ', $this->productSlug)),
            'License Key',
            'manage_options',
            $this->pageSlug,
            [$this, 'renderSettingsPage']
        );
    }

    /**
     * Render the license settings page
     */
    public function renderSettingsPage(): void {
        $status = $this->getLicenseStatus();
        $nonce  = wp_nonce_field('ln_action_' . $this->productSlug, 'ln_nonce', true, false);
        ?>
        <div class="wrap">
            <h1>License Key — <?php echo esc_html(ucwords(str_replace('-', ' ', $this->productSlug))); ?></h1>
            <?php settings_errors('ln_messages'); ?>

            <div style="max-width:600px; margin-top:20px;">
                <table class="form-table">
                    <tr>
                        <th>License Status</th>
                        <td>
                            <?php if ($status['activated']): ?>
                                <span style="color:#00a32a; font-weight:600;">✔ Active</span>
                                <?php if (!empty($status['expiresAt'])): ?>
                                    &nbsp;(Expires: <?php echo esc_html(date('Y-m-d', strtotime($status['expiresAt']))); ?>)
                                <?php endif; ?>
                            <?php else: ?>
                                <span style="color:#d63638; font-weight:600;">✘ Not Activated</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php if ($status['activated']): ?>
                    <tr>
                        <th>License Key</th>
                        <td><code><?php echo esc_html($status['licenseKey'] ?? '—'); ?></code></td>
                    </tr>
                    <tr>
                        <th>Registered Domain</th>
                        <td><?php echo esc_html($status['domain']); ?></td>
                    </tr>
                    <?php endif; ?>
                </table>

                <hr>

                <?php if (!$status['activated']): ?>
                <h2>Activate License</h2>
                <form method="post">
                    <?php echo $nonce; ?>
                    <input type="hidden" name="ln_action" value="activate">
                    <table class="form-table">
                        <tr>
                            <th><label for="ln_credential">License Key / Purchase Code</label></th>
                            <td>
                                <input type="text" name="ln_credential" id="ln_credential"
                                       class="regular-text" placeholder="LIC-XXXX-XXXX-XXXX-XXXX or Envato UUID" required>
                                <label style="display:block; margin-top:6px;">
                                    <input type="checkbox" name="ln_is_purchase_code" value="1">
                                    This is an Envato purchase code
                                </label>
                            </td>
                        </tr>
                    </table>
                    <?php submit_button('Activate License', 'primary', 'submit', false); ?>
                </form>
                <?php else: ?>
                <h2>Deactivate License</h2>
                <p>Deactivating releases your activation slot so you can use it on another domain.</p>
                <form method="post">
                    <?php echo $nonce; ?>
                    <input type="hidden" name="ln_action" value="deactivate">
                    <?php submit_button('Deactivate This Installation', 'secondary', 'submit', false); ?>
                </form>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }

    /**
     * Handle form POST actions (activate / deactivate)
     */
    public function handleFormSubmit(): void {
        if (
            !isset($_POST['ln_nonce']) ||
            !wp_verify_nonce($_POST['ln_nonce'], 'ln_action_' . $this->productSlug) ||
            !current_user_can('manage_options')
        ) return;

        $action = $_POST['ln_action'] ?? '';

        if ($action === 'activate') {
            $credential      = sanitize_text_field($_POST['ln_credential'] ?? '');
            $isPurchaseCode  = !empty($_POST['ln_is_purchase_code']);

            $res = $this->activate($credential, $isPurchaseCode, home_url());

            if (!empty($res['valid'])) {
                add_settings_error('ln_messages', 'activated', '✔ License successfully activated!', 'updated');
            } else {
                add_settings_error('ln_messages', 'error', '✘ ' . ($res['message'] ?? 'Activation failed.'), 'error');
            }
        }

        if ($action === 'deactivate') {
            $this->deactivate('WordPress admin deactivation');
            add_settings_error('ln_messages', 'deactivated', 'License deactivated. Activation slot released.', 'updated');
        }
    }

    /**
     * Show admin notice if license is not active
     */
    public function showAdminNotice(): void {
        if ($this->isActive()) return;
        $screen = get_current_screen();
        if ($screen && str_contains($screen->id, $this->pageSlug)) return;

        $url = admin_url('options-general.php?page=' . $this->pageSlug);
        echo '<div class="notice notice-warning is-dismissible"><p>';
        echo '<strong>' . esc_html(ucwords(str_replace('-', ' ', $this->productSlug))) . ':</strong> ';
        printf(
            'Please <a href="%s">activate your license key</a> to receive automatic updates and unlock pro features.',
            esc_url($url)
        );
        echo '</p></div>';
    }

    /**
     * Add "License" link to plugin action links
     */
    public function addPluginActionLinks(array $links): array {
        $url    = admin_url('options-general.php?page=' . $this->pageSlug);
        $prefix = $this->isActive() ? '✔ ' : '⚠ ';
        array_unshift($links, '<a href="' . esc_url($url) . '">' . $prefix . 'License</a>');
        return $links;
    }

    /**
     * Daily WP-Cron heartbeat — refreshes token silently
     */
    public function cronHeartbeat(): void {
        $result = $this->validate();
        if ($result['valid'] && !empty($result['grace_period'])) {
            // Grace period: keep transient active a bit longer
            set_transient($this->transientKey, 'active', 3600);
        } elseif (!$result['valid']) {
            delete_transient($this->transientKey);
        }
    }

    /**
     * Hook into WordPress update system to deliver plugin updates
     */
    public function checkForUpdate(object $transient): object {
        if (!$this->isActive()) return $transient;

        $update = $this->checkUpdate();
        if (empty($update['updateAvailable']) || empty($update['latestVersion'])) return $transient;

        $pluginSlug = plugin_basename($this->pluginFile);
        $transient->response[$pluginSlug] = (object)[
            'slug'        => $this->productSlug,
            'plugin'      => $pluginSlug,
            'new_version' => $update['latestVersion'],
            'url'         => $update['changelog'] ?? '',
            'package'     => $update['downloadUrl'] ?? '',
        ];

        return $transient;
    }

    /**
     * Provide plugin info for WordPress "View Details" popup
     */
    public function pluginInfo(mixed $result, string $action, object $args): mixed {
        if ($action !== 'plugin_information') return $result;
        if (!isset($args->slug) || $args->slug !== $this->productSlug) return $result;

        $update = $this->checkUpdate();
        return (object)[
            'name'          => ucwords(str_replace('-', ' ', $this->productSlug)),
            'slug'          => $this->productSlug,
            'version'       => $update['latestVersion'] ?? $this->productVersion,
            'requires'      => '5.8',
            'tested'        => '6.6',
            'download_link' => $update['downloadUrl'] ?? '',
            'sections'      => ['changelog' => $update['changelog'] ?? 'No changelog available.'],
        ];
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private function getTransientExpiry(array $data): int {
        if (!empty($data['cachedUntil'])) {
            $expires = strtotime($data['cachedUntil']) - time();
            return max(0, $expires);
        }
        return 86400; // 24 hours default
    }
}
