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

const fetchBuffer = (url: string) => fetch(url).then((response) => {
    if(response.status !== 200) throw Error(`Could not download file from ${url}`);
    return response.arrayBuffer()
});

const getFileFromWeb = async (url: string, filename: string) => {
    const tempFolder = await fs.getTemporaryFolder();
    const file = await tempFolder.createFile(filename, { overwrite: true });
    console.log('Downloading file', url);
    const buffer = await fetchBuffer(url);
    file.write(buffer, { format: storage.formats.utf8 });
    return file;
}

const getTemplateFile = async (templateName: string) => {
    let file: storage.File | undefined;
    if(templatesFolder) {
        file = await templatesFolder.getEntry(templateName) as storage.File;
    } else{
        const encodedTemplateName = encodeURIComponent(templateName);
        const templateFileURL = `${process.env.TEMPLATES_FOLDER_URL}/${encodedTemplateName}`;
        file = await getFileFromWeb(templateFileURL, templateName)
    }
    if (!file || !file.isFile) throw Error(`Could not find template '${templateName}'`);
    return file;
}

const openTemplate = (templateName: string) => {
    return core.executeAsModal(async () => {
        const templateFile = await getTemplateFile(templateName);
        const document = await app.open(templateFile as unknown as File)
        console.log('Opened template', document);
    }, { commandName: 'Opening file' });
}

const populateDocumentFromRow = (row: DataRow) =>
    openTemplate(row['Template']).then(async () => {
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
                await getFileFromWeb(row[columnName], filename)
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

const exportDocument = (filename: string) => {
    const switchElement = document.querySelector('sp-radio-group[name="export-type"]') as HTMLInputElement;
    const filetype = switchElement.value as 'png' | 'psd';
    filename += filetype;
    return exportFolder.createFile(filename, { overwrite: true })
        .then((exportFile) => core.executeAsModal(() => app.activeDocument.saveAs[filetype](exportFile as unknown as File), { commandName: 'Exporting file' }));
}

const createImageFromRow = (row: DataRow) =>
    populateDocumentFromRow(row)
        .then(() => `${row['Order number'].substring(1)} - ${row['Product']}`.replace('*', '-').replace('/', '-'))
        .then((filename) => exportDocument(filename))
        .then(() => console.log('exported', row['Order number']))
        .then(() => core.executeAsModal(() =>app.activeDocument.close(constants.SaveOptions.DONOTSAVECHANGES), { commandName: 'Closing file' }));


async function generate() {
    const data = await inputFile.read({ format: storage.formats.binary });
    const workbook = xlsx.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = (xlsx.utils.sheet_to_json(worksheet) as DataRow[]).filter((row) => row['Template']);

    let processed = 0;
    for (const row of rows) {
        console.log('Start', row['Order number'], row['Template']);
        try {
            await createImageFromRow(row);
            processed++;
        } catch (err) {
            console.error('Error', err);
            await core.showAlert({message: `Error while processing ${row['Order number']}`});
        }
        console.log('Done', row['Order number']);
    }
    await core.showAlert({message: `${processed} rows have been processed`});
}

function updateGenerateButton() {
    const valid = !!(inputFile && exportFolder);
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

document.getElementById('btnGenerate')?.addEventListener('click', generate);
