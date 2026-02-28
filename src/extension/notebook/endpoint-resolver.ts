
import { Endpoint, FileEndpoint, HttpEndpoint } from "../endpoint";
import { EndpointKind } from "../endpoint/const/endpoint-kind";
import { SparqlQuery } from '../endpoint/model/sparql-query';
import { notebookEndpoint } from '../endpoint/endpoint';
import { NotebookFileLoader } from './notebook-file-loader';
import { Uri } from 'vscode';

export class EndpointResolver {

    private fileLoader: NotebookFileLoader;

    constructor() {
        this.fileLoader = new NotebookFileLoader();
    }

    /**
     * Returns an Endpoint instance for the given SPARQL query, either from the document or the global connection.
     * 
     * @param sparqlQuery - The SPARQL query to get the endpoint for.
     * @param notebookUri - The URI of the current notebook, used for resolving relative file paths.
     * @returns An Endpoint instance for the given SPARQL query, or null if no endpoint could be found.
     */
    public async getDocumentOrConnectionClient(sparqlQuery: SparqlQuery, notebookUri?: Uri): Promise<Endpoint | null> {

        const documentEndpointSet = sparqlQuery.extractEndpoint();
        const documentEndpoints = documentEndpointSet.getEndpoints();

        const queryOptions = sparqlQuery.extractQueryOptions();

        if (documentEndpoints.length > 0) {

            if (documentEndpoints[0].kind === EndpointKind.Http) {
                // http endpoint (only one is supported)
                return new HttpEndpoint(documentEndpoints[0].endpoint, "", "");
            }

            if (documentEndpoints[0].kind === EndpointKind.File) {
                // file endpoint
                const oxigraphStore = new FileEndpoint();

                for (const extractFileEndpoint of documentEndpoints) {
                    await this.fileLoader.loadFileToStore(extractFileEndpoint.endpoint, oxigraphStore, notebookUri);
                }

                if (queryOptions.size > 0) {
                    const hasUseDefaultGraphAsUnion = queryOptions.get('use_default_graph_as_union');

                    if (hasUseDefaultGraphAsUnion && hasUseDefaultGraphAsUnion === 'true') {
                        oxigraphStore.useDefaultGraphAsUnion();
                    }
                }

                return oxigraphStore;
            }
        }

        // its not a document endpoint use notebook endpoint configuration
        if (sparqlQuery.isUpdateQuery) {
            return notebookEndpoint.updateEndpoint;
        }
        return notebookEndpoint.endpoint;
    }
}
