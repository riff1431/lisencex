<?php
/**
 * LicenseNest WordPress & PHP Licensing Client Helper Class
 * 
 * Embed into WordPress plugins, themes, or standalone PHP applications.
 */

if (!class_exists('LicenseNestClient')) {

    class LicenseNestClient {
        private $apiUrl;
        private $productSlug;
        private $installationId;
        private $domain;
        private $version;
        private $tokenOptionKey;

        public function __construct($apiUrl, $productSlug, $version) {
            $this->apiUrl = rtrim($apiUrl, '/');
            $this->productSlug = $productSlug;
            $this->version = $version;
            $this->domain = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
            $this->tokenOptionKey = 'licensenest_token_' . sanitize_key($productSlug);
            $this->installationId = $this->get_or_create_installation_id();
        }

        private function get_or_create_installation_id() {
            $key = 'licensenest_ins_' . sanitize_key($this->productSlug);
            $id = get_option($key);
            if (!$id) {
                $id = 'ins_wp_' . wp_generate_uuid4();
                update_option($key, $id);
            }
            return $id;
        }

        public function activate_license($license_key_or_purchase_code, $is_purchase_code = false) {
            $endpoint = $this->apiUrl . '/public/licenses/activate';

            $body = array(
                'productSlug' => $this->productSlug,
                'installationId' => $this->installationId,
                'domain' => $this->domain,
                'productVersion' => $this->version,
            );

            if ($is_purchase_code) {
                $body['purchaseCode'] = trim($license_key_or_purchase_code);
            } else {
                $body['licenseKey'] = trim($license_key_or_purchase_code);
            }

            $response = wp_remote_post($endpoint, array(
                'headers' => array('Content-Type' => 'application/json'),
                'body' => wp_json_encode($body),
                'timeout' => 15,
            ));

            if (is_wp_error($response)) {
                return array('success' => false, 'message' => $response->get_error_message());
            }

            $data = json_decode(wp_remote_retrieve_body($response), true);
            if (!empty($data['success']) && !empty($data['data']['token'])) {
                update_option($this->tokenOptionKey, $data['data']['token']);
            }

            return $data;
        }

        public function validate_license() {
            $token = get_option($this->tokenOptionKey);
            if (!$token) {
                return array('valid' => false, 'status' => 'UNACTIVATED');
            }

            $endpoint = $this->apiUrl . '/public/licenses/validate';
            $response = wp_remote_post($endpoint, array(
                'headers' => array('Content-Type' => 'application/json'),
                'body' => wp_json_encode(array(
                    'productSlug' => $this->productSlug,
                    'installationId' => $this->installationId,
                    'token' => $token,
                    'domain' => $this->domain,
                    'productVersion' => $this->version,
                )),
                'timeout' => 10,
            ));

            if (is_wp_error($response)) {
                // Return offline grace period status if network error
                return array('valid' => true, 'status' => 'OFFLINE_GRACE_PERIOD');
            }

            $data = json_decode(wp_remote_retrieve_body($response), true);
            return !empty($data['data']) ? $data['data'] : array('valid' => false);
        }

        public function deactivate_license() {
            $token = get_option($this->tokenOptionKey);
            $endpoint = $this->apiUrl . '/public/licenses/deactivate';

            $response = wp_remote_post($endpoint, array(
                'headers' => array('Content-Type' => 'application/json'),
                'body' => wp_json_encode(array(
                    'installationId' => $this->installationId,
                    'token' => $token,
                    'domain' => $this->domain,
                    'reason' => 'WordPress plugin deactivation',
                )),
            ));

            delete_option($this->tokenOptionKey);
            return json_decode(wp_remote_retrieve_body($response), true);
        }
    }
}
