
import { NotebookCellExecution, window, commands } from 'vscode';
import { SimpleHttpResponse, Endpoint } from '../endpoint/endpoint';
import { MimeType } from '../const/enum/mime-type';
import { QLeverError } from '../endpoint/model/qlever-error';
import { SparqlQuery } from '../endpoint/model/sparql-query';
import { notebookEndpoint } from '../endpoint/endpoint';
import { writeError } from '../sparql-query-handler/helper/write-error';

export class NotebookErrorRenderer {

    public showHttpErrorMessage(queryResult: SimpleHttpResponse, httpErrorStatusText: string, endpoint: Endpoint, execution: NotebookCellExecution) {
        let errorMessage = `\n`;

        if (endpoint.isQLeverEndpoint) {
            const errorObject = JSON.parse(queryResult.data) as QLeverError;
            errorMessage += `${errorObject.exception} at line ${errorObject.metadata.line}, position ${errorObject.metadata.positionInLine}`;
        } else {

            if (queryResult.headers['content-type'] && queryResult.headers['content-type'] === MimeType.json) {
                const errorObject = JSON.parse(queryResult.data) as any;
                if (errorObject.message) {
                    errorMessage += errorObject.message;
                } else {
                    errorMessage += JSON.stringify(errorObject, null, 2);
                }
            } else {
                errorMessage += queryResult.data
            }

        }

        execution.replaceOutput([
            writeError(errorMessage)
        ]);
    }

    public showNetworkErrorMessage(error: any, execution: NotebookCellExecution) {
        let errorMessage = error.message ?? "error";
        if (error.hasOwnProperty("response") && error.response.hasOwnProperty("data")) {
            if (error.response.data.message) {
                errorMessage += "\n" + error.response.data.message;
            } else {
                errorMessage += "\n" + error.response.data + "\nstatus: " + error.response.status + " " + error.response.statusText;
            }
        }
        execution.replaceOutput([
            writeError(errorMessage)
        ]);
    }

    public showConnectionErrorMessage(sparqlQuery: SparqlQuery, execution: NotebookCellExecution) {
        let errorMessage = "";

        if (sparqlQuery.isUpdateQuery && notebookEndpoint.endpoint) {
            errorMessage = "Not connected to a SPARQL Update Endpoint. Configure your endpoint settings.";
        } else {
            errorMessage = "Not connected to a SPARQL Endpoint";

            const actionButton = "Connect to SPARQL Endpoint";

            window.showErrorMessage(errorMessage, actionButton).then((action) => {
                if (action === actionButton) {
                    commands.executeCommand('sparql-notebook.connect');
                }
            });

        }

        execution.replaceOutput([
            writeError(errorMessage)
        ]);
    }
}
