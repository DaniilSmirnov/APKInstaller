const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  target: 'web',
  entry: './src/device-manager-ui/index.tsx',
  output: { path: path.resolve(__dirname, '../dist/DeviceManagerUI'), filename: 'device-manager.js', clean: true },
  resolve: { extensions: ['.js', '.ts', '.tsx'] },
  module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: 'ts-loader' }, { test: /\.css$/, use: ['style-loader', 'css-loader'] }] },
  plugins: [new HtmlWebpackPlugin({ template: './src/device-manager-ui/index.ejs', filename: 'index.html' })],
  devtool: 'source-map',
};
