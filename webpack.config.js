module.exports = {
  entry: {
    "public/hello": "./src/client/index.js",
    "server": "./src/server/index.js",
  },
  output: {
    filename: '[name].js',
    path: __dirname + "/build",
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
}
