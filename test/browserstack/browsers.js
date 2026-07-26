/**
 * Target matrix for the BrowserStack runs.
 *
 * `real-devices` is the default because gpu.js lives or dies on the driver
 * behind the WebGL context, and emulators do not reproduce the mobile GPU
 * drivers that actually break it.
 */

const realDevices = [
  {
    name: 'iPhone 15 Pro (iOS 17)',
    capabilities: { deviceName: 'iPhone 15 Pro', osVersion: '17', browserName: 'safari', realMobile: 'true' }
  },
  {
    name: 'iPhone 14 (iOS 16)',
    capabilities: { deviceName: 'iPhone 14', osVersion: '16', browserName: 'safari', realMobile: 'true' }
  },
  {
    name: 'iPad Pro 12.9 2022 (iOS 16)',
    capabilities: { deviceName: 'iPad Pro 12.9 2022', osVersion: '16', browserName: 'safari', realMobile: 'true' }
  },
  {
    name: 'Samsung Galaxy S23 (Android 13)',
    capabilities: { deviceName: 'Samsung Galaxy S23', osVersion: '13.0', browserName: 'chrome', realMobile: 'true' }
  },
  {
    name: 'Google Pixel 7 (Android 13)',
    capabilities: { deviceName: 'Google Pixel 7', osVersion: '13.0', browserName: 'chrome', realMobile: 'true' }
  }
];

const desktop = [
  {
    name: 'Chrome / Windows 11',
    capabilities: { os: 'Windows', osVersion: '11', browserName: 'Chrome', browserVersion: 'latest' }
  },
  {
    name: 'Firefox / Windows 11',
    capabilities: { os: 'Windows', osVersion: '11', browserName: 'Firefox', browserVersion: 'latest' }
  },
  {
    name: 'Edge / Windows 11',
    capabilities: { os: 'Windows', osVersion: '11', browserName: 'Edge', browserVersion: 'latest' }
  },
  {
    name: 'Safari / macOS Sonoma',
    capabilities: { os: 'OS X', osVersion: 'Sonoma', browserName: 'Safari', browserVersion: 'latest' }
  }
];

module.exports = {
  'real-devices': realDevices,
  desktop: desktop,
  all: realDevices.concat(desktop)
};
