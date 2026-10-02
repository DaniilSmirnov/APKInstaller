const path = require('path');

module.exports = {
  target: 'electron-main',
  entry: './src/main/main.ts',
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: 'main.js',
  },
  resolve: {
    extensions: ['.js', '.ts'],
  },
  // Keep the ADB client as a runtime dependency. Bundling adbkit pulls in
  // optional protocol helpers and makes the main compilation unnecessarily
  // large and unreliable. Electron Builder packages production dependencies.
  externals: {
    '@devicefarmer/adbkit': 'commonjs2 @devicefarmer/adbkit',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
    ],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  devtool: 'source-map',
};
