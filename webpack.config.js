const path = require('node:path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const SOURCE_DIR = path.resolve(__dirname, 'src');
const APP_DIR = `${SOURCE_DIR}/app`;
const BUILD_DIR = path.resolve(__dirname, 'build');

module.exports = {
  context: SOURCE_DIR,
  resolve: {
    modules: [path.resolve(APP_DIR), 'node_modules']
  },
  entry: {
    app: './app/entry.tsx'
  },
  output: {
    path: BUILD_DIR,
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        loader: 'babel-loader',
        // Skip any files outside of your project's `src` directory
        include: [APP_DIR]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html'
    }),
    new webpack.DefinePlugin({
      'process.env': {
        version: JSON.stringify(process.env.npm_package_version),
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development')
      }
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'favicons',
          to: 'favicons'
        }
      ]
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'provided.js',
          // Kept readable: it's meant to be edited post-build
          info: { minimized: true }
        }
      ]
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'settings.js',
          // Kept readable: it's meant to be edited post-build
          info: { minimized: true }
        }
      ]
    })
  ]
};
