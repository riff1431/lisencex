<?php
/**
 * EXAMPLE: WordPress Plugin — Full Integration Demo
 *
 * File: my-awesome-plugin.php (plugin root)
 *
 * This example demonstrates the complete license integration
 * pattern for a commercial WordPress plugin.
 */

/*
 * Plugin Name:  My Awesome Plugin
 * Plugin URI:   https://yoursite.com/my-awesome-plugin
 * Description:  An example plugin with LicenseNest integration.
 * Version:      1.4.0
 * Author:       Your Name
 * Text Domain:  my-awesome-plugin
 */

if (!defined('ABSPATH')) exit;

define('MAP_VERSION', '1.4.0');
define('MAP_SLUG',    'my-awesome-plugin');
define('MAP_API_URL', 'https://your-licensenest-api.com/api/v1');

// ── Load LicenseNest SDK ──────────────────────────────────────────────────────
require_once __DIR__ . '/includes/class-licensenest-plugin.php';

global $map_license;
$map_license = new LicenseNest_Plugin_License(
    MAP_API_URL,
    MAP_SLUG,
    MAP_VERSION,
    __FILE__
);
$map_license->register();

// ── Boot plugin ───────────────────────────────────────────────────────────────
add_action('plugins_loaded', function() use ($map_license) {

    // ── Quick local check (no network call) ───────────────────────────────────
    if (!$map_license->isActive()) {
        // Free features still available here
        return;
    }

    // ── Pro features — only loaded when license is active ─────────────────────
    require_once __DIR__ . '/pro/class-pro-features.php';
    new MAP_Pro_Features();

});

// ── Shortcode available to all users (free tier) ─────────────────────────────
add_shortcode('map_widget', function() {
    return '<div class="map-free-widget">Free widget content</div>';
});

// ── Pro shortcode — license-gated ─────────────────────────────────────────────
add_shortcode('map_pro_widget', function() use ($map_license) {
    if (!$map_license->isActive()) {
        return '<p>⚠ This is a Pro feature. <a href="' . admin_url('options-general.php?page=' . MAP_SLUG . '-license') . '">Activate your license.</a></p>';
    }
    return '<div class="map-pro-widget">Pro widget content</div>';
});

// ── Uninstall cleanup ─────────────────────────────────────────────────────────
register_uninstall_hook(__FILE__, function() use ($map_license) {
    $map_license->deactivate('Plugin uninstalled');
});
