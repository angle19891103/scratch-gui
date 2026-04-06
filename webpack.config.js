const path = require('path');
const webpack = require('webpack');

// Plugins
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// 🟢 新增：引入压缩插件
const CompressionPlugin = require('compression-webpack-plugin');

const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');

// const STATIC_PATH = process.env.STATIC_PATH || '/static';

const commonHtmlWebpackPluginOptions = {
    // Google Tag Manager ID
    // Looks like 'GTM-XXXXXXX'
    gtm_id: process.env.GTM_ID || '',

    // Google Tag Manager env & auth info for alterative GTM environments
    // Looks like '&gtm_auth=0123456789abcdefghijklm&gtm_preview=env-00&gtm_cookies_win=x'
    // Taken from the middle of: GTM -> Admin -> Environments -> (environment) -> Get Snippet
    // Blank for production
    gtm_env_auth: process.env.GTM_ENV_AUTH || ''
};

const baseConfig = new ScratchWebpackConfigBuilder(
    {
        rootPath: path.resolve(__dirname),
        enableReact: true,
        // 🟢 优化 1：开启代码分割，防止单一 JS 文件过大阻塞加载
        shouldSplitChunks: true,
        publicPath: 'auto'
    })
    .setTarget('browserslist')
    .merge({
        // 🟢 优化 2：开启 Webpack 5 文件系统缓存，大幅提升二次打包速度
        cache: {
            type: 'filesystem',
            buildDependencies: {
                config: [__filename]
            }
        },
        output: {
            // 🟢 优化 3：确保分离出来的 chunk 带有 hash，方便浏览器利用强缓存
            chunkFilename: 'static/assets/[name].[contenthash].js',
            assetModuleFilename: 'static/assets/[name].[hash][ext][query]',
            library: {
                name: 'GUI',
                type: 'umd2'
            }
        },
        // 🟢 优化 4：细化代码分割策略，将超大依赖剥离
        optimization: {
            splitChunks: {
                chunks: 'all',
                minSize: 30000,
                maxSize: 500000, // 将大于 500KB 的包尝试进一步拆分
                cacheGroups: {
                    react: {
                        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                        name: 'react-vendor',
                        priority: 20,
                    },
                    scratchCore: {
                        test: /[\\/]node_modules[\\/](scratch-blocks|scratch-vm|scratch-render|scratch-audio|scratch-storage)[\\/]/,
                        name: 'scratch-core',
                        priority: 15,
                    },
                    vendors: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        priority: 10,
                    }
                }
            }
        },
        resolve: {
            fallback: {
                Buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify')
            }
        }
    })
    .addModuleRule({
        test: /\.(svg|png|wav|mp3|gif|jpg)$/,
        resourceQuery: /^$/, // reject any query string
        type: 'asset', // let webpack decide on the best type of asset
        // 🟢 优化 5：限制小资源内联大小（仅对小于 8KB 的图片/音频转 Base64，避免撑爆 JS 体积）
        parser: {
            dataUrlCondition: {
                maxSize: 8 * 1024
            }
        }
    })
    .addPlugin(new webpack.DefinePlugin({
        'process.env.DEBUG': Boolean(process.env.DEBUG),
        'process.env.GA_ID': `"${process.env.GA_ID || 'UA-000000-01'}"`,
        'process.env.GTM_ENV_AUTH': `"${process.env.GTM_ENV_AUTH || ''}"`,
        'process.env.GTM_ID': process.env.GTM_ID ? `"${process.env.GTM_ID}"` : null
    }))
    .addPlugin(new CopyWebpackPlugin({
        patterns: [
            {
                from: 'node_modules/scratch-blocks/media',
                to: 'static/blocks-media/default'
            },
            {
                from: 'node_modules/scratch-blocks/media',
                to: 'static/blocks-media/high-contrast'
            },
            {
                // overwrite some of the default block media with high-contrast versions
                // this entry must come after copying scratch-blocks/media into the high-contrast directory
                from: 'src/lib/themes/high-contrast/blocks-media',
                to: 'static/blocks-media/high-contrast',
                force: true
            },
            {
                context: 'node_modules/scratch-vm/dist/web',
                from: 'extension-worker.{js,js.map}',
                noErrorOnMissing: true
            },
            {
                context: 'node_modules/scratch-storage/dist/web',
                from: 'chunks/*.{js,js.map}',
                noErrorOnMissing: true
            }
        ]
    }));

if (!process.env.CI) {
    baseConfig.addPlugin(new webpack.ProgressPlugin());
}

// build the shipping library in `dist/`
const distConfig = baseConfig.clone()
    .merge({
        entry: {
            'scratch-gui': path.join(__dirname, 'src/index.js')
        },
        output: {
            path: path.resolve(__dirname, 'dist')
        }
    })
    .addExternals(['react', 'react-dom'])
    .addPlugin(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'src/lib/libraries/*.json',
                    to: 'libraries',
                    flatten: true
                }
            ]
        })
    );

// build the examples and debugging tools in `build/`
const buildConfig = baseConfig
    .clone()
    .enableDevServer(process.env.PORT || 8601)
    .merge({
        entry: {
            gui: "./src/playground/index.jsx",
            blocksonly: "./src/playground/blocks-only.jsx",
            compatibilitytesting: "./src/playground/compatibility-testing.jsx",
            player: "./src/playground/player.jsx",
        },
        output: {
            path: path.resolve(__dirname, "build"),
        },
    })
    .addPlugin(
        new HtmlWebpackPlugin({
            ...commonHtmlWebpackPluginOptions,
            chunks: ["gui"],
            template: "src/playground/index.ejs",
            title: "BlockCode",
        })
    )
    .addPlugin(
        new HtmlWebpackPlugin({
            ...commonHtmlWebpackPluginOptions,
            chunks: ["blocksonly"],
            filename: "blocks-only.html",
            template: "src/playground/index.ejs",
            title: "BlockCode: Blocks Only Example",
        })
    )
    .addPlugin(
        new HtmlWebpackPlugin({
            ...commonHtmlWebpackPluginOptions,
            chunks: ["compatibilitytesting"],
            filename: "compatibility-testing.html",
            template: "src/playground/index.ejs",
            title: "BlockCode: Compatibility Testing",
        })
    )
    .addPlugin(
        new HtmlWebpackPlugin({
            ...commonHtmlWebpackPluginOptions,
            chunks: ["player"],
            filename: "player.html",
            template: "src/playground/index.ejs",
            title: "BlockCode: Player Example",
        })
    )
    .addPlugin(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "static",
                    to: "static",
                },
                {
                    from: "extensions/**",
                    to: "static",
                    context: "src/examples",
                },
            ],
        })
    );

// Skip building `dist/` unless explicitly requested
const buildDist = process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'dist';

// 🟢 优化 6：仅在生产环境构建时开启 Gzip 压缩
if (buildDist) {
    const compressionOptions = {
        filename: '[path][base].gz',
        algorithm: 'gzip',
        test: /\.(js|css|html|svg)$/,
        threshold: 10240, // 仅对大于 10KB 的文件进行压缩
        minRatio: 0.8
    };
    distConfig.addPlugin(new CompressionPlugin(compressionOptions));
    buildConfig.addPlugin(new CompressionPlugin(compressionOptions));
}

module.exports = buildDist ?
    [buildConfig.get(), distConfig.get()] :
    buildConfig.get();