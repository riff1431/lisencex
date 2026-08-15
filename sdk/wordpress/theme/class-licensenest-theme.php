<?php
/**
 * LicenseNest — WordPress Theme Integration
 *
 * Drop this file into your theme's `inc/` folder.
 * Requires: LicenseNest_Base_Client.php
 *
 * USAGE in your theme's functions.php:
 *
 *   require_once get_template_directory() . '/inc/class-licensenest-theme.php';
 *
 *   $theme_license = new LicenseNest_Theme_License(
 *       'https://your-licensenest-api.com/api/v1',
 *       'your-theme-slug',
 *       wp_get_theme()->get('Version')
 *   );
 *
 *   $theme_license->register();
 *
 *   // Gate premium theme features:
 *   if ($theme_license->isActive()) { ... }
 */

if (!defined('ABSPATH')) exit;

require_once __DIR__ . '/../../core/LicenseNest_Base_Client.php';

class LicenseNest_Theme_License extends LicenseNest_Base_Client {

    private string $optionPrefix;
    private string $transientKey;
    private string $pageSlug;

    public function __construct(string $apiUrl, string $productSlug, string $productVersion) {
        parent::__construct($apiUrl, $productSlug, $productVersion);
        $this->optionPrefix = 'ln_theme_' . sanitize_key($productSlug) . '_';
        $this->transientKey = 'ln_theme_status_' . sanitize_key($productSlug);
        $this->pageSlug     = sanitize_key($productSlug) . '-license';
    }

    // ─── Storage via WordPress Options ──────────────────────────────────────

    protected function writeCache(array $data): void {
        update_option($this->optionPrefix . 'cache', $data, false);
        set_transient($this->transientKey, 'active', $this->calcExpiry($data));
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
            $id = 'ins_th_' . wp_generate_password(14, false);
            update_option($this->optionPrefix . 'inst_id', $id, false);
        }
        return $id;
    }

    protected function getDomain(): string {
        return parse_url(home_url(), PHP_URL_HOST) ?: 'localhost';
    }

    // ─── Public helpers ──────────────────────────────────────────────────────

    public function isActive(): bool {
        if (get_transient($this->transientKey) === 'active') return true;
        $cached = $this->readCache();
        if (empty($cached['token'])) return false;
        return !empty($cached['gracePeriodUntil']) && strtotime($cached['gracePeriodUntil']) > time();
    }

    /**
     * Register WordPress hooks
     */
    public function register(): void {
        add_action('admin_menu',     [$this, 'addAdminPage']);
        add_action('admin_init',     [$this, 'handleFormSubmit']);
        add_action('admin_notices',  [$this, 'showAdminNotice']);

        // Cron heartbeat
        add_action('ln_theme_cron_' . sanitize_key($this->productSlug), [$this, 'cronHeartbeat']);
        if (!wp_next_scheduled('ln_theme_cron_' . sanitize_key($this->productSlug))) {
            wp_schedule_event(time(), 'daily', 'ln_theme_cron_' . sanitize_key($this->productSlug));
        }

        // Theme update hook
        add_filter('pre_set_site_transient_update_themes', [$this, 'checkForUpdate']);
    }

    /**
     * Add license page under Appearance menu
     */
    public function addAdminPage(): void {
        add_theme_page(
            'Theme License',
            'License Key',
            'manage_options',
            $this->pageSlug,
            [$this, 'renderPage']
        );
    }

    public function renderPage(): void {
        $status = $this->getLicenseStatus();
        $nonce  = wp_nonce_field('ln_theme_action_' . $this->productSlug, 'ln_nonce', true, false);
        ?>
        <div class="wrap">
            <h1>Theme License — <?php echo esc_html(wp_get_theme()->get('Name')); ?></h1>
            <?php settings_errors('ln_theme_messages'); ?>
            <div style="max-width:600px; margin-top:20px;">
                <p><strong>Status:</strong>
                    <?php if ($status['activated']): ?>
                        <span style="color:#00a32a;">✔ Active</span>
                        <?php if (!empty($status['licenseType'])): ?>
                            — <?php echo esc_html(strtoupper($status['licenseType'])); ?> license
                        <?php endif; ?>
                    <?php else: ?>
                        <span style="color:#d63638;">✘ Not activated</span>
                    <?php endif; ?>
                </p>

                <?php if (!$status['activated']): ?>
                <form method="post">
                    <?php echo $nonce; ?>
                    <input type="hidden" name="ln_action" value="activate">
                    <p>
                        <label><strong>License Key or Envato Purchase Code</strong></label><br>
                        <input type="text" name="ln_credential" class="regular-text"
                               placeholder="LIC-XXXX or Envato UUID" required>
                    </p>
                    <p>
                        <label>
                            <input type="checkbox" name="ln_is_purchase_code" value="1">
                            This is an Envato purchase code
                        </label>
                    </p>
                    <?php submit_button('Activate Theme License', 'primary', 'submit', false); ?>
                </form>
                <?php else: ?>
                <p><strong>Domain:</strong> <?php echo esc_html($status['domain']); ?></p>
                <p><strong>License Key:</strong> <code><?php echo esc_html($status['licenseKey'] ?? '—'); ?></code></p>
                <form method="post">
                    <?php echo $nonce; ?>
                    <input type="hidden" name="ln_action" value="deactivate">
                    <?php submit_button('Deactivate License', 'secondary', 'submit', false); ?>
                </form>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }

    public function handleFormSubmit(): void {
        if (
            !isset($_POST['ln_nonce']) ||
            !wp_verify_nonce($_POST['ln_nonce'], 'ln_theme_action_' . $this->productSlug) ||
            !current_user_can('manage_options')
        ) return;

        $action = $_POST['ln_action'] ?? '';

        if ($action === 'activate') {
            $res = $this->activate(
                sanitize_text_field($_POST['ln_credential'] ?? ''),
                !empty($_POST['ln_is_purchase_code']),
                home_url()
            );
            if (!empty($res['valid'])) {
                add_settings_error('ln_theme_messages', 'ok', '✔ Theme license activated!', 'updated');
            } else {
                add_settings_error('ln_theme_messages', 'err', '✘ ' . ($res['message'] ?? 'Activation failed.'), 'error');
            }
        }

        if ($action === 'deactivate') {
            $this->deactivate('Theme admin deactivation');
            add_settings_error('ln_theme_messages', 'ok', 'License deactivated. Slot released.', 'updated');
        }
    }

    public function showAdminNotice(): void {
        if ($this->isActive()) return;
        $url = admin_url('themes.php?page=' . $this->pageSlug);
        echo '<div class="notice notice-warning is-dismissible"><p>';
        printf('Theme license not activated. <a href="%s">Activate now</a> to enable automatic updates and pro features.', esc_url($url));
        echo '</p></div>';
    }

    public function cronHeartbeat(): void {
        $this->validate();
    }

    /**
     * Inject theme update into WordPress transient
     */
    public function checkForUpdate(object $transient): object {
        if (!$this->isActive()) return $transient;

        $update = $this->checkUpdate();
        if (empty($update['updateAvailable']) || empty($update['latestVersion'])) return $transient;

        $themeDir = get_template();
        $transient->response[$themeDir] = [
            'theme'       => $themeDir,
            'new_version' => $update['latestVersion'],
            'url'         => $update['changelog'] ?? '',
            'package'     => $update['downloadUrl'] ?? '',
        ];

        return $transient;
    }

    private function calcExpiry(array $data): int {
        if (!empty($data['cachedUntil'])) {
            return max(0, strtotime($data['cachedUntil']) - time());
        }
        return 86400;
    }
}
