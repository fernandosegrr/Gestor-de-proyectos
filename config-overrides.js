const path = require('path');
const webpack = require('webpack');

module.exports = function override(config, env) {
  // Add plugins to handle node modules
  config.plugins = (config.plugins || []).concat([
    new webpack.IgnorePlugin({
      resourceRegExp: /^node:/,
    }),
    // Provide Buffer globally
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: path.resolve(__dirname, 'src/process-polyfill.js'),
    }),
  ]);

  // Add externals for package.json
  config.externals = config.externals || [];
  config.externals.push(function(context, request, callback) {
    if (request === '../../../package.json') {
      return callback(null, 'window.pkg');
    }
    callback();
  });

  // Add fallbacks for Node.js core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    process: path.resolve(__dirname, 'src/process-polyfill.js'),
    util: require.resolve('util/'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    fs: false,
    path: false,
    crypto: false,
    os: false,
    http: false,
    https: false,
    url: false,
    querystring: false,
    zlib: false,
    child_process: false,
    tls: false,
    net: false,
    dns: false,
    assert: false,
    constants: false,
    events: false,
    punycode: false,
    string_decoder: false,
    timers: false,
    tty: false,
    vm: false,
    http2: path.resolve(__dirname, 'src/http2-mock.js'),
  };

  // Add alias for node: modules
  config.resolve.alias = {
    ...config.resolve.alias,
    'node:buffer': require.resolve('buffer'),
    'node:util': require.resolve('util/'),
    'node:stream': require.resolve('stream-browserify'),
    'node:fs': false,
    'node:path': false,
    'node:crypto': false,
    'node:http': false,
    'node:https': false,
    'node:url': false,
    'node:net': false,
    'node:zlib': false,
    'gaxios/build/cjs/src/util.cjs': path.resolve(__dirname, 'src/gaxios-mock.js'),
  };

  return config;
};
