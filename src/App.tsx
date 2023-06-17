// App imports
import React from 'react';
import Spectrum from 'react-uxp-spectrum';

import { storage } from 'uxp';
import { app, core, constants } from 'photoshop';

import './App.css';
import AmeaService from '@services/amea-service';
import PhotoshopService from '@services/photoshop-service';
import DownloadService from '@services/download-service';
import type { Document } from 'photoshop/dom/Document';
import GenerateInputs from '@components/GenerateInputs';

type OutputType = keyof Document['saveAs'];

export default function App() {
    const [rows, setRows] = React.useState<DataRow[] | undefined>(undefined);
    const [outputFolder, setOutputFolder] = React.useState<storage.Folder | undefined>(undefined);
    const [templatesFolder, setTemplatesFolder] = React.useState<storage.Folder | undefined>(undefined);
    const [outputType, setOutputType] = React.useState<OutputType>('png');

    const populateDocumentFromRow = async (row: DataRow) => {
        for (const columnName of Object.keys(row)) {
            const layer = app.activeDocument.layers.getByName(columnName);
            if (!layer) continue;
            if (layer.kind === constants.LayerKind.TEXT) {
                await core.executeAsModal(() => PhotoshopService.setText(layer, row[columnName]), { commandName: `Change text for '${columnName}'` });
            }
            else if (layer.kind === constants.LayerKind.SMARTOBJECT) {
                const fileURL = row[columnName];
                const filenameRegex = /.*\/(.*)/g;
                const filename = filenameRegex.exec(fileURL)[1];
                const file = await DownloadService.getFileFromWeb(fileURL, filename);
                core.executeAsModal(() => PhotoshopService.setImage(layer, file), { commandName: `Change image for '${columnName}'` });
            }
        }
    }

    const addEffectsToDocumentFromRow = async (row: DataRow) => {
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
    }

    const exportDocument = async (outputFolder: storage.Folder, filename: string, outputType: OutputType = 'png') => {
        const outputFile = await outputFolder.createFile(filename, { overwrite: true });
        await core.executeAsModal(() => app.activeDocument.saveAs[outputType](outputFile as unknown as File), { commandName: 'Exporting file' })
    }

    const generateImageFromRow = async (row: DataRow, templatesFolder: storage.Folder, outputFolder: storage.Folder, filename: string, outputType: OutputType = 'png') => {
        const templateFile = await templatesFolder.getEntry(row.Template) as storage.File;
        await PhotoshopService.openPhotoshopFile(templateFile);
        await populateDocumentFromRow(row);
        await addEffectsToDocumentFromRow(row);
        await exportDocument(outputFolder, filename, outputType);
        await PhotoshopService.closeDocument();
    }

    const handleGenerate = async () => {
        const templates = rows.map((row) => row.Template).filter((value, index, self) => self.indexOf(value) === index);

        if (!templatesFolder) {
            for (const template of templates) {
                await AmeaService.downloadTemplateFile(template);
                console.log('Template downloaded', templatesFolder);
            }
        }

        const tempFolder = await storage.localFileSystem.getTemporaryFolder();
        let proccessedRows = 0;
        for (const row of AmeaService.mapFilenames(rows)) {
            try {
                await generateImageFromRow(row, templatesFolder ?? tempFolder, outputFolder, row.filename, outputType);
                proccessedRows += 1;
            } catch (error) {
                console.error(error);
                await core.showAlert({ message: `Error while processing ${row['Order number']}` });
            }
        }
        await core.showAlert({ message: `${proccessedRows} row${proccessedRows > 1 ? 's have' : ' has'}  been processed` });
    }

    return (
        <div className="panel">
            <Spectrum.Heading size="M">Generate templates</Spectrum.Heading>
            <Spectrum.Detail>Generate images from templates based on data from a xlsx-file</Spectrum.Detail>
            <Spectrum.Divider size="medium" />
            <Spectrum.Body>
                <GenerateInputs
                    rows={rows}
                    outputFolder={outputFolder}
                    onRowsChange={(rows) => setRows(rows)}
                    onOutputFolderChange={(folder) => setOutputFolder(folder)}
                    onOutputTypeChange={(type) => setOutputType(type)}
                    onTemplatesFolderChange={(folder) => setTemplatesFolder(folder)}
                />
            </Spectrum.Body>
            <footer>
                <Spectrum.Button variant="cta" disabled={!rows || !outputFolder} onClick={() => handleGenerate()}>
                    Generate
                </Spectrum.Button>
            </footer>
        </div>
    );
}
