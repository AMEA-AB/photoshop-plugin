import '@babel/polyfill';
import React from 'react';
// import "./styles.css";
import { PanelController } from "./controllers/PanelController";
import { CommandController } from "./controllers/CommandController";
import { About } from "./components/About";
import Generate from "./panels/Generate";

import { entrypoints } from "uxp";

const aboutController = new CommandController(
    ({ dialog }) => <About dialog={dialog} />,
    {
        id: "showAbout",
        title: "About AMEA Plugin",
        size: { width: 480, height: 480 },
    }
);
const demosController = new PanelController(() => <Generate />, {
    id: "demos",
    menuItems: [
        {
            id: "dialog1",
            label: "About AMEA Plugin",
            enabled: true,
            checked: false,
            oninvoke: () => aboutController.run(),
        },
    ],
});

entrypoints.setup({
    plugin: {
        create(plugin) {
            console.log("created", plugin);
        },
        destroy() {
            console.log("destroyed");
        },
    },
    commands: {
        showAbout: aboutController,
    },
    panels: {
        generate: demosController
    },
});
