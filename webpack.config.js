const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const fs = require('fs')
const exec = require('child_process').exec;
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const gchelpers = require('./src/_scripts/_modules/helpers.js')

async function getConfig() {

  // Configurable options for the build
  const userConfig = {

    /* Languages to be supported by syntax highlighting in Reveal 
     (the more fonts, the heavier the bundle will be) */
    HIGHLIGHT_LANGUAGES: ['xml', 'swift', 'bash'],

  }


  const htmlList = await gchelpers.getEntries('./src/')
  const [entries, htmlPluginList] = gchelpers.getEntriesAndHTMLPlugins(htmlList)

  return {
    entry: entries,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'lib/js/[name].js'
    },

    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              // // see https://github.com/FortAwesome/Font-Awesome/
              // // and https://github.com/fabiosantoscode/terser/issues/50
              // collapse_vars: true,
            },
            output: null,
          },
          sourceMap: false
        }),
        new OptimizeCSSAssetsPlugin({})
      ]
    },

    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader'
          }
        },
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              // options: {
              //   modules: true,
              //   sourceMap: true,
              //   importLoader: 2
              // }
            },
            'sass-loader',
          ],
        },
        {
          test: /(eot|woff|woff2|ttf|svg)(\?\S*)?$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]',
                // publicPath: './../../',
                publicPath: '../webfonts/',
                outputPath: 'lib/webfonts/',
                emitFile: true
              }
            }
          ]
        },
      ]
    },

    resolve: {
      alias: {
        nodePath: path.join(__dirname, 'node_modules'),
        stylesPath: path.join(__dirname, 'src/_styles'),
      }
    },

    devServer: {
      contentBase: path.join(__dirname, "dist/"),
      port: 9000
    },

    plugins: [
      ...htmlPluginList,


      new webpack.ProvidePlugin({
        Reveal: 'reveal.js',
      }),

      /* Copy some needed files in hierarchy */
      new CopyWebpackPlugin([
        // speaker note base window
        { from: 'node_modules/reveal.js/plugin/notes/notes.html', to: 'lib/js/reveal.js-dependencies/notes.html' },
        // styles for slides export to to pdf
        { from: { glob: 'node_modules/reveal.js/css/print/*.css' }, to: 'lib/css/[name].css' },
        // any files in content
        {
          context: 'src/content',
          from: '**/*',
          to: 'content/'
        }
      ]),

      new CopyWebpackPlugin([
        // Style from reveal.js-menu, css (not compatible with svg inline)
        { from: 'node_modules/reveal.js-menu/menu.css', to: 'lib/css/menu.css' },
      ]),

      new webpack.DefinePlugin({
        HIGHLIGHT_LANGUAGES: JSON.stringify(Object.assign({}, userConfig.HIGHLIGHT_LANGUAGES)),
      }),

      /* Include only Highlights.js languages that are specified in configEnv.HIGHLIGHT_LANGUAGES */
      new webpack.ContextReplacementPlugin(
        /highlight\.js\/lib\/languages$/,
        new RegExp(`^./(${userConfig.HIGHLIGHT_LANGUAGES.join('|')})$`),
      ),

      new MiniCssExtractPlugin({
        filename: 'lib/css/[name].css',
        // chunkFilename: "lib/css/[name].css"
      }),


      

      // clean up generatedEntries folder of file-specific tree shaking for FA icons
      // only when not in dev-server
      {
        apply: (compiler) => {
          compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) => {
            if (process.env.NODE_ENV != 'dev-server') {
              exec('rm -R ./src/_scripts/_generatedEntries', (err, stdout, stderr) => {
                if (stdout) process.stdout.write(stdout);
                if (stderr) process.stderr.write(stderr);
              });
            }
          });
        }
      },
    ].filter((plugin) => plugin !== false) // filter out skipped conditions
  };

}

const isEnv = (name) => process.env.NODE_ENV === name

module.exports = getConfig();

