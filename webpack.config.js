const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development', // or 'production' depending on your needs
  entry: './public/assets/js/main.js',  // Front-end entry point
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public', 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  resolve: {
    fallback: {
      "util": require.resolve("util/"),
      "buffer": require.resolve("buffer/"),
      "stream": require.resolve("stream-browserify/"),
      "assert": require.resolve("assert/"),
      "http": require.resolve("stream-http/"),
      "https": require.resolve("https-browserify/"),
      "os": require.resolve("os-browserify/browser"),
      "url": require.resolve("url/")
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
};
