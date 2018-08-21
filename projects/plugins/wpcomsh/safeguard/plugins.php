<?php
namespace Safeguard;
/**
 * Plugin Name: Safeguard
 * Description: Checking plugin for safety and compatibility.
 * Version: 0.0.6
 * Author: Automattic
 * Author URI: http://automattic.com/
 */

require_once dirname( __FILE__ ) . '/utils.php';
/**
 * `upgrader_pre_download` filter for checking plugin before install.
 *
 * @param $reply
 * @param $package
 * @param $wp_upgrader
 *
 * @return bool|WP_Error
 */

$attachment_data = array();

add_filter( 'wp_insert_attachment_data', function ( $data ) use( $attachment_data ) {
	$attachment_data = $data;

	add_filter( 'upgrader_pre_download', function ( $reply, $package, $wp_upgrader ) use( $attachment_data ) {
		// ensure package is a plugin
		if (
			! array_key_exists( 'skin', $wp_upgrader ) ||
			! is_a( $wp_upgrader->skin, 'Plugin_Installer_Skin' )
		) {
			return false;
		}

		// avoid checking if the package source is an URL
		$package_is_url = filter_var( $package, FILTER_VALIDATE_URL );
		if ( $package_is_url ) {
			return false;
		}

		// get plugin slug from package file
		$plugin_data = get_plugin_data_from_package( $package );
		if ( is_wp_error( $plugin_data ) ) {
			log_safeguard_error( $plugin_data, array( 'package' => $package ) );
			return false;
		}

		// create request body
		$request_body = array();

		// check the plugin exists in wordpress.org
		$plugin_info = search_plugin_info( $plugin_data['slug'] );
		if ( is_wp_error( $plugin_info ) ) {
			$request_body['not-registered'] = true;
			log_safeguard_error( 'Plugin not registered in wporg', array( 'package' => $package ) );
		}

		$request_body['file_url'] = $attachment_data['guid'];
		$request_body['hash'] = $plugin_data['hash'];
		$request_body['version'] = $plugin_data['version'];

		// check plugin hitting the WP COM API endpoint
		$checking_passed = request_check_plugin( $plugin_data['slug'], $request_body );
		if ( is_wp_error( $checking_passed ) ) {
			log_safeguard_error( $checking_passed, array(
				'package' => $package,
				'info'    => $checking_passed->get_error_data()
			) );
		}

		// remember, return `false` if plugin is ok. Filters ¯\_(ツ)_/¯
		return false;
	}, 1, 3 );

	return $data;
} );


/*
 * it's possible trying to catch the uploading process when
 * the package cames from the REST API, instead of the wp-admin uploading page
 * TODO: let's keep yhis 
 */
// add_filter( 'upgrader_pre_download', function ( $reply, $package, $wp_upgrader ) use( $attachment_data ) {
// 	// avoid checking if the package source is an URL
// 	$package_is_url = filter_var( $package, FILTER_VALIDATE_URL );
// 	if ( $package_is_url ) {
// 		return false;
// 	}

// }, 1, 3 );
