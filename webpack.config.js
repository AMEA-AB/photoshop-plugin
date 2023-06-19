const path = require('path');
const Dotenv = require('dotenv-webpack');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

let package = require('./package.json');

function setVersionNumber(buffer) {
   var manifest = JSON.parse(buffer.toString());
   manifest.version = package.version;
   return JSON.stringify(manifest, null, 4);
}

module.exports = function (_env, argv) {
    const isProduction = argv.mode === 'production';
    const isDevelopment = !isProduction;

    return {
        devtool: isDevelopment && 'cheap-module-source-map',
        entry: './src/index.tsx',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'index.js',
            publicPath: '/',
        },
        externals: {
            photoshop: 'commonjs2 photoshop',
            uxp: 'commonjs2 uxp',
            os: 'commonjs2 os',
        },
        resolve: {
            modules: [path.resolve(__dirname, 'node_modules')],
            extensions: ['.ts', '.tsx', '.js', 'jsx', '.css'],
            alias: {
                "@services": path.resolve(__dirname, "src/services/"),
                "@helpers": path.resolve(__dirname, "src/helpers"),
                "@components": path.resolve(__dirname, "src/components/")
            } 
        },
        module: {
            rules: [
                {
                    test: /\.(jsx?|tsx?)$/,
                    resolve: {
                        extensions: ['.js', 'jsx', '.ts', '.tsx'],
                    },
                    exclude: /(node_modules)/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                cacheDirectory: true,
                                cacheCompression: false,
                                envName: isProduction ? 'production' : 'development',
                            },
                        },
                    ],
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader'],
                },
            ],
        },
        plugins: [
            new Dotenv({
                safe: isDevelopment,
            }),
            new CleanWebpackPlugin(),
            new CopyPlugin({
                patterns: [
                    {
                        from: 'plugin/manifest.json',
                        to: 'manifest.json',
                        transform: (content, _path) => setVersionNumber(content),
                    },
                    {
                        from: 'plugin',
                    }
                ],
            }),
        ],
    };
};
