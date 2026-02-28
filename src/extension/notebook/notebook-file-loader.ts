
import { RelativePattern, Uri, window, workspace } from 'vscode';
import * as path from 'path';
import { FileEndpoint } from '../endpoint/file-endpoint/file-endpoint';

export class NotebookFileLoader {

    public async loadFileToStore(filePathPattern: string, fileEndpoint: FileEndpoint, notebookUri?: Uri): Promise<void> {
        const fileUri: Uri[] = [];

        if (filePathPattern.startsWith('/')) {
            // Absolute pattern
            const fileName = path.basename(filePathPattern);
            const directory = path.dirname(filePathPattern);
            const relativePattern = new RelativePattern(directory, fileName);
            const files = await workspace.findFiles(relativePattern);

            fileUri.push(...files);
        } else {
            // Relative pattern
            if (!notebookUri) {
                window.showErrorMessage('Notebook URI is required for relative paths');
                return;
            }

            const notebookDirectory = path.dirname(notebookUri.fsPath);
            const normalizedPattern = path.normalize(path.join(notebookDirectory, filePathPattern));

            const fileName = path.basename(normalizedPattern);
            const directory = path.dirname(normalizedPattern);

            const relativePattern = new RelativePattern(directory, fileName);
            const files = await workspace.findFiles(relativePattern);

            fileUri.push(...files);
            if (files.length === 0) {
                window.showErrorMessage(`No files found for pattern ${filePathPattern}`);
            }
        }

        for (const uri of fileUri) {
            await fileEndpoint.addFile(uri);
        };
    }
}
