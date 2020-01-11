const path = require('path');
const webpack = require('webpack');

const public = {
  entry:{
    index:    "./scripts/public/index.js",
  },
  output:{
  	filename: '[name].js',
    publicPath:"/scripts/",
  	path: path.resolve(__dirname, '../libretto.server/public/scripts')
  },
  plugins: [
    // new webpack.IgnorePlugin(/^(?:electron|ws)$/),
    // new webpack.ProvidePlugin({
    //     $: "jquery",
    //     jQuery: "jquery",
    //     "window.jQuery": "jquery",
    //     Promise: 'es6-promise'
    // })
  ],
  module: {
  	rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            "presets":[
              ["@babel/preset-env", {
                "corejs": 3,
                "useBuiltIns": "entry"
              }] 
            ],
            "comments": false
          }
        }
      }
    ]
  },
  devtool:'eval',
  mode: "development",
  watch: true
};

module.exports = [public]