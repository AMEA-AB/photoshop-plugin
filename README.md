# AMEA Photoshop Plugin

Generate images from templates based on data from a xlsx-file

## Building the plugin

In the plugin folder (that contains the `package.json` file), install the dependencies by running:

```shell
yarn
```

After that, you need to build the plugin's `dist/index.js` file (that the `index.html` loads) by running:

or

```shell
yarn build
```

This, internally, runs `webpack` and builds the `dist/index.js` from the `src/index.ts` file.

After that, you can load the plugin into Photoshop using the UXP Developer Tool:

## Loading in Photoshop

You can load this plugin directly in Photoshop by using the UXP Developer Tools application. Once started, click "Add Plugin...", and navigate to the "manifest.json" file in this folder. Then click the ••• button next to the corresponding entry in the developer tools and click "Load". Switch over to Photoshop, and the plugin's panel will be running.

## Developing the plugin

You have to install the [Adobe UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/)

Run the `watch` script (`yarn watch`), to automatically rebuild the plugin when files changes.

In `Adobe UXP Developer Tool` click `Add plugin` and locate the manifest.json file in the built files, in the `dist` directory.
Make sure you have Photoshop opened and click the three dots in the `Adobe UXP Developer Tool` for the plugin. Load the plugin, then click watch to also reload the plugin when the built files changes.

You can click `Debug` to open the console and inspect elements. 
