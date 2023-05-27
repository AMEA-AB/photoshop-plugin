import { storage } from 'uxp';
import { app, core, action, constants } from "photoshop";
import * as xlsx from 'xlsx';
import { LayerKind } from 'photoshop/dom/Constants';
import { Layer } from 'photoshop/dom/Layer';

const fs = storage.localFileSystem;

interface DataRow {
    'Template': string;
    'Order number': string;
    'Product': string;
    [key: string]: string;
}

let inputFile: storage.File | undefined;

let exportFolder: storage.Folder | undefined;

let templatesFolder: storage.Folder | undefined;

const invertLayer = (layer: Layer, invert: boolean) => action.batchPlay(
    [
        {
            "_obj": invert ? "show" : "hide",
            "null": [
                {
                    "_ref": [
                        {
                            "_ref": "solidFill",
                            "_index": 1
                        },
                        {
                            "_ref": "layer",
                            "_id": layer.id
                        }
                    ]
                }
            ]
        }
    ],
    { modalBehavior: "execute" }
);

const setImage = (layer: Layer, image: storage.File) => {
    const targetWidth = layer.bounds.width;
    const targetHeight = layer.bounds.height;

    return action.batchPlay(
        [
            {
                "_obj": "select",
                "_target": [
                    {
                        "_ref": "layer",
                        "_id": layer.id
                    }
                ],
                "makeVisible": false,
                "_isCommand": true
            },
            {
                "_obj": "placedLayerReplaceContents",
                "null": {
                    "_path": fs.createSessionToken(image),
                    "_kind": "local"
                },
                "_isCommand": true
            }
        ],
        { modalBehavior: "execute" }
    )
        .then(() => {
            const scaleX = (targetWidth / layer.bounds.width) * 100;
            const scaleY = (targetHeight / layer.bounds.height) * 100;
            return layer.scale(scaleX, scaleY, constants.AnchorPosition.MIDDLECENTER);
        });
}

const setText = (layer: Layer, text: string) => action.batchPlay(
    [
        {
            "_obj": "set",
            "_target": [
                {
                    "_ref": "layer",
                    "_id": layer.id
                }
            ],
            "to": {
                "_obj": "textLayer",
                "textKey": text,
            },
        }
    ],
    { modalBehavior: "execute" }
);

const fetchBuffer = (url: string) => fetch(url).then((response) => response.arrayBuffer());

const openTemplate = (templateName: string, templatesFolder: storage.Folder) =>
    core.executeAsModal(
        async () => {
            const templateFile = await templatesFolder.getEntry(templateName);
            if (!templateFile.isFile) throw Error('Path is not a file');
            await app.open(templateFile as unknown as File);
        }, { commandName: 'Opening file' }
    );

const populateDocumentFromRow = (row: DataRow, templatesFolder: storage.Folder) =>
    openTemplate(row['Template'], templatesFolder).then(async () => {
        for (const columnName in row) {
            const layer = app.activeDocument.layers.getByName(columnName);
            if (!layer) continue;
            if (layer.kind === LayerKind.TEXT) {
                await core.executeAsModal(() => setText(layer, row[columnName]), { commandName: `Change text for '${columnName}'` });
                continue;
            }
            else if (layer.kind === LayerKind.SMARTOBJECT) {
                const filenameRegex = /.*\/uploads\/(.*)/g;
                const filename = filenameRegex.exec(row[columnName])[1];
                await fs.getTemporaryFolder()
                    .then((tempFolder) => tempFolder.createFile(filename, { overwrite: true }))
                    .then(async (file) => {
                        const buffer = await fetchBuffer((row[columnName]));
                        file.write(buffer, { format: storage.formats.utf8 });
                        return file;
                    })
                    .then((file) => core.executeAsModal(() => {
                        console.log('Set image', columnName);
                        return setImage(layer, file).then(() => console.log('Image has been set', columnName));
                    }
                        , { commandName: `Change image for '${columnName}'` })
                    )
            }
        }
        // Invert colors
        const invert = row['Invert'] === 'true';
        for(const layer of app.activeDocument.layers) {
            await core.executeAsModal(() => invertLayer(layer, invert), { commandName: 'Inverting colors' });
        }


    }).then(() => console.log('All layers populated for', row['Order number']));

const createImageFromRow = (row: DataRow, templatesFolder: storage.Folder, exportFolder: storage.Folder) =>
    populateDocumentFromRow(row, templatesFolder)
        .then(() => `${row['Order number'].substring(1)} - ${row['Product']}.png`.replace('*', '-').replace('/', '-'))
        .then((filename) => exportFolder.createFile(filename, { overwrite: true }))
        .then((exportFile) => core.executeAsModal(() => app.activeDocument.saveAs.png(exportFile as unknown as File).then(() => { }), { commandName: "Saving image" }))
        .then(() => console.log('exported', row['Order number']))
        .then(() => core.executeAsModal(() =>app.activeDocument.close(constants.SaveOptions.DONOTSAVECHANGES), { commandName: 'Closing file' }));


async function showLayerNames() {
    const data = await inputFile.read({ format: storage.formats.binary });
    const workbook = xlsx.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = (xlsx.utils.sheet_to_json(worksheet) as DataRow[]).filter((row) => row['Template']);

    let processed = 0;
    for (const row of rows) {
        console.log('Start', row['Order number'], row['Template']);
        try {
            await createImageFromRow(row, templatesFolder, exportFolder);
            processed++;
        } catch (err) {
            console.log('Error', err);
            await core.showAlert({message: `Error while processing ${row['Order number']}`});
        }
        console.log('Done', row['Order number']);
    }
    await core.showAlert({message: `${processed} rows have been processed`});
}

function updateGenerateButton() {
    const valid = !!(inputFile && exportFolder && templatesFolder);
    if(valid) {
        document.getElementById('btnGenerate')?.removeAttribute('disabled');
    } else {
        document.getElementById('btnGenerate')?.setAttribute('disabled', "");
    }
}

async function setInputFile() {
    const file = await fs.getFileForOpening({ types: ['xlsx'], allowMultiple: false });
    if (!file || Array.isArray(file)) {
        await core.showAlert({message: 'Please select an input file'});
        return;
    }
    inputFile = file;
    updateGenerateButton();
}

async function setExportFolder() {
    const folder = await fs.getFolder({ initialDomain: storage.domains.userDesktop });
    if (!folder) {
        await core.showAlert({message: 'Please select a folder for export'});
        return;
    }
    exportFolder = folder;
    updateGenerateButton();
}

async function setTemplatesFolder() {
    const folder = await fs.getFolder({ initialDomain: storage.domains.userDesktop });
    if (!folder) {
        await core.showAlert({message: 'Please select a folder with templates'});
        return;
    }
    templatesFolder = folder;
    updateGenerateButton();
}

document.getElementById('btnInput')?.addEventListener('click', setInputFile);

document.getElementById('btnOutput')?.addEventListener('click', setExportFolder);

document.getElementById('btnTemplates')?.addEventListener('click', setTemplatesFolder);

document.getElementById('btnGenerate')?.addEventListener('click', showLayerNames);
