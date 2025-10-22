const webpack = require('webpack');
const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Add fallbacks for Node.js modules
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        fallback: {
          ...webpackConfig.resolve?.fallback,
          "process": require.resolve("process/browser.js"),
          "buffer": require.resolve("buffer"),
          "crypto": require.resolve("crypto-browserify"),
          "stream": require.resolve("stream-browserify"),
          "assert": require.resolve("assert"),
          "http": require.resolve("stream-http"),
          "https": require.resolve("https-browserify"),
          "os": require.resolve("os-browserify/browser"),
          "url": require.resolve("url"),
          "util": require.resolve("util"),
          "vm": false,
          "fs": false,
          "net": false,
          "tls": false,
          "child_process": false,
          "path": require.resolve("path-browserify")
        }
      };

      // Add plugins to provide global variables
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.ProvidePlugin({
          process: 'process/browser.js',
          Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.DefinePlugin({
          'process.env': JSON.stringify({
            NODE_ENV: env || 'development',
            REACT_APP_API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000'
          }),
          global: 'globalThis',
        }),
      ];

      // Ignore source map warnings for node_modules
      if (env === 'development') {
        webpackConfig.ignoreWarnings = [
          /Failed to parse source map/,
          /Can't resolve 'process\/browser'/,
        ];
      }

      return webpackConfig;
    },
  },
};
