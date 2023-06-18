# AMEA Photoshop Plugin

Generate images from templates based on data from a xlsx-file

## Building the plugin

In the plugin folder (that contains the `package.json` file), install the dependencies by running:

```shell
yarn
```

After that, you need to build the plugin's `dist/index.js` file (that the `index.html` loads) by running:

```shell
yarn build
```

This, internally, runs `webpack` and builds the `dist/index.js` from the `src/index.ts` file.

After that, you can load the plugin into Photoshop using the UXP Developer Tool:

## Loading in Photoshop

You can load this plugin directly in Photoshop by using the [Adobe UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/) application. Once started, click "Add Plugin...", and navigate to the "manifest.json" file in the dist folder. Then click the ••• button next to the corresponding entry in the developer tools and click "Load". Switch over to Photoshop, and the plugin's panel will be running.

## Developing the plugin

Make sure the plugin is loaded in Photoshop. 

Rebuild the plugin every time files changes
```shell
yarn watch
```

Click the ••• button next to the corresponding entry in the developer tools and click "Watch". This will reload the plugin every time the files in the dist folder has changed.

You can click the ••• button again and click on "Debug" to open the console and to inspect elements for the plugin. 