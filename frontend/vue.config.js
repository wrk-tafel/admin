module.exports = {
  lintOnSave: false,
  runtimeCompiler: true,
  configureWebpack: {
    devtool: 'source-map',
    //Necessary to run npm link https://webpack.js.org/configuration/resolve/#resolve-symlinks
    resolve: {
       symlinks: false
    },
    devServer: {
        proxy: {
            '/api': {
                target: 'http://localhost:8080'
            }
        }
    }
  },
  transpileDependencies: [
    '@coreui/utils'
  ]
}
