const { NormalModuleReplacementPlugin } = require('webpack');

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
    entry: "./src/server/index.js",
    output: {
      filename: 'server.js',
      path: __dirname + "/build",
    },
    plugins: [
      new NormalModuleReplacementPlugin(/any-promise/, __dirname + '/src/server/Promise.js'),
    ],
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
