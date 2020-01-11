const nodeExternals = require('webpack-node-externals');

const shared = {

};

module.exports = [
  {
    ...shared,
    entry: "./src/client/index.js",
    output: {
      "filename": "hello.js",
      path: __dirname + "/build/public",
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
  },
  {
    ...shared,
    target: 'node',
    externals: [nodeExternals()],
    entry: "./src/server/index.js",
    output: {
      filename: 'server.js',
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
              presets: [
                [
                  '@babel/preset-env',
                  {
                    targets: {
                      node: true,
                    }
                  }
                ]
              ]
            }
          }
        }
      ]
    }
  }
];
