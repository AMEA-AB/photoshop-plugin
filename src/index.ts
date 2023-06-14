import { storage } from 'uxp';
import { app, core, constants } from "photoshop";
import * as xlsx from 'xlsx';
import { LayerKind } from 'photoshop/dom/Constants';

import PhotoshopService from '@services/photoshop-service';
import DownloadService from '@services/download-service';
import AmeaService from '@services/amea-service';
import { replaceAllInString } from '@helpers';

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

const openTemplate = (templateName: string) => {
    return core.executeAsModal(async () => {
        const templateFile = await AmeaService.getTemplateFile(templateName, templatesFolder);
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
                console.log("Setting text", columnName, row[columnName], !!row[columnName]);
                await core.executeAsModal(() => PhotoshopService.setText(layer, row[columnName]), { commandName: `Change text for '${columnName}'` });
                continue;
            }
            else if (layer.kind === LayerKind.SMARTOBJECT) {
                const filenameRegex = /.*\/(.*)/g;
                const filename = filenameRegex.exec(row[columnName])[1];
                await DownloadService.getFileFromWeb(row[columnName], filename)
                    .then((file) => core.executeAsModal(() => {
                        console.log('Set image', columnName);
                        return PhotoshopService.setImage(layer, file).then(() => console.log('Image has been set', columnName));
                    }
                        , { commandName: `Change image for '${columnName}'` })
                    )
            }
        }
        // Invert colors
        const invert = row['Invert'] === 'true';
        for (const layer of app.activeDocument.layers) {
            await core.executeAsModal(() => PhotoshopService.invertLayer(layer, invert), { commandName: 'Inverting colors' });
        }

        // Mirror document
        const mirror = row['Mirror'] === 'true';
        if (mirror) {
            await core.executeAsModal(() => PhotoshopService.mirrorDocument(app.activeDocument), { commandName: 'Mirroring document' });
        }

    }).then(() => console.log('All layers populated for', row['Order number']));

const exportDocument = (filename: string) => {
    const switchElement = document.querySelector('sp-radio-group[name="export-type"]') as HTMLInputElement;
    const filetype = switchElement.value as 'png' | 'psd';
    return exportFolder.createFile(filename, { overwrite: true })
        .then((exportFile) => core.executeAsModal(() => app.activeDocument.saveAs[filetype](exportFile as unknown as File), { commandName: 'Exporting file' }));
}

const createImageFromRow = (row: DataRow) =>
    populateDocumentFromRow(row)
        .then(() => {
            const order_number = replaceAllInString(row['Order number'], '#', '');
            const product = replaceAllInString(replaceAllInString(row['Product'], '*', '-'), '/', '-');
            return `${order_number} - ${product}`
        })
        .then((filename) => {
            console.log('exporting to ', filename);
            return exportDocument(filename)
        })
        .then(() => console.log('exported', row['Order number']))
        .then(() => core.executeAsModal(() => app.activeDocument.close(constants.SaveOptions.DONOTSAVECHANGES), { commandName: 'Closing file' }));


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
            await core.showAlert({ message: `Error while processing ${row['Order number']}` });
        }
        console.log('Done', row['Order number']);
    }
    await core.showAlert({ message: `${processed} row${processed > 1 ? 's have' : ' has'}  been processed` });
}

function updateGenerateButton() {
    const valid = !!(inputFile && exportFolder);
    if (valid) {
        document.getElementById('btnGenerate')?.removeAttribute('disabled');
    } else {
        document.getElementById('btnGenerate')?.setAttribute('disabled', "");
    }
}

async function setInputFile() {
    const file = await fs.getFileForOpening({ types: ['xlsx'], allowMultiple: false });
    if (!file || Array.isArray(file)) {
        await core.showAlert({ message: 'Please select an input file' });
        return;
    }
    inputFile = file;
    updateGenerateButton();
}

async function setExportFolder() {
    const folder = await fs.getFolder({ initialDomain: storage.domains.userDesktop });
    if (!folder) {
        await core.showAlert({ message: 'Please select a folder for export' });
        return;
    }
    exportFolder = folder;
    updateGenerateButton();
}

async function setTemplatesFolder() {
    const folder = await fs.getFolder({ initialDomain: storage.domains.userDesktop });
    if (!folder) {
        await core.showAlert({ message: 'Please select a folder with templates' });
        return;
    }
    templatesFolder = folder;
    updateGenerateButton();
}

document.getElementById('btnInput')?.addEventListener('click', setInputFile);

document.getElementById('btnOutput')?.addEventListener('click', setExportFolder);

document.getElementById('btnTemplates')?.addEventListener('click', setTemplatesFolder);

document.getElementById('btnGenerate')?.addEventListener('click', generate);
