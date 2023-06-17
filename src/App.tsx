// App imports
import React from 'react';
import Spectrum from 'react-uxp-spectrum';

import { storage } from 'uxp';
import { app, core, constants } from 'photoshop';

import * as xlsx from 'xlsx';

import { replaceAllInString } from '@helpers';
import './App.css';
import AmeaService from '@services/amea-service';
import PhotoshopService from '@services/photoshop-service';
import DownloadService from '@services/download-service';
import { Document } from 'photoshop/dom/Document';

type OutputType = keyof Document['saveAs'];

export default function App() {
    const [rows, setRows] = React.useState<DataRow[] | undefined>(undefined);
    const [outputFolder, setOutputFolder] = React.useState<storage.Folder | undefined>(undefined);
    const [templatesFolder, setTemplatesFolder] = React.useState<storage.Folder | undefined>(undefined);
    const [outputType, setOutputType] = React.useState<OutputType>('png');

    const handleSelectInputFile = async () => {
        const file = await storage.localFileSystem.getFileForOpening({ types: ['xlsx'], allowMultiple: false });
        if (!file || Array.isArray(file)) {
            await core.showAlert({ message: 'Please select an input file' });
            return;
        }
        const data = await file.read({ format: storage.formats.binary });
        const workbook = xlsx.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const rows = (xlsx.utils.sheet_to_json(worksheet) as DataRow[]).filter((row) => row.Template);
        setRows(rows);
    };

    const handleSelectOutputFolder = async () => {
        const folder = await storage.localFileSystem.getFolder({ initialDomain: storage.domains.userDesktop });
        if (!folder) {
            await core.showAlert({ message: 'Please select a folder for outputs' });
            return;
        }
        setOutputFolder(folder);
    };

    const handleSelectTemplatesFolder = async () => {
        const folder = await storage.localFileSystem.getFolder({ initialDomain: storage.domains.userDesktop });
        if (!folder) return;
        setTemplatesFolder(folder);
    };

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
                <div className="button-container">
                    <Spectrum.Button variant={rows ? 'primary' : 'warning'} onClick={() => handleSelectInputFile()}>
                        Select input (xlsx-file)
                    </Spectrum.Button>
                </div>
                <div className="button-container">
                    <Spectrum.Button variant={outputFolder ? 'primary' : 'warning'} onClick={() => handleSelectOutputFolder()}>
                        Select output folder
                    </Spectrum.Button>
                </div>
                <div className="button-container">
                    <Spectrum.Button variant="secondary" onClick={() => handleSelectTemplatesFolder()}>
                        Select local templates folder
                    </Spectrum.Button>
                    <Spectrum.Detail>
                        Select a local folder if you don&apos;t want to use templates in the cloud.
                    </Spectrum.Detail>
                </div>
                <Spectrum.RadioGroup onChange={(e) => setOutputType(e.target.value as 'png' | 'psd')}>
                    <Spectrum.Label slot="label">Output filetype</Spectrum.Label>
                    <Spectrum.Radio checked value="png">
                        PNG
                    </Spectrum.Radio>
                    <Spectrum.Radio value="psd">PSD</Spectrum.Radio>
                </Spectrum.RadioGroup>
            </Spectrum.Body>
            <footer>
                <Spectrum.Button variant="cta" disabled={!rows || !outputFolder} onClick={() => handleGenerate()}>
                    Generate
                </Spectrum.Button>
            </footer>
        </div>
    );
}
