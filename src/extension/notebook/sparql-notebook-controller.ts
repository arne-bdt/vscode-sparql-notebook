import { NotebookCell, RelativePattern, NotebookCellOutputItem, NotebookController, NotebookDocument, Uri, commands, notebooks, window, workspace, NotebookCellExecution } from 'vscode';
import { extensionId } from "../extension";
import { SparqlNotebookCell } from './sparql-notebook-cell';
import path = require('path');
import { SparqlQueryHandler } from '../sparql-query-handler/sparql-query-handler';
import { SelectQueryHandler } from '../sparql-query-handler/select-query-handler';
import { AskQueryHandler } from '../sparql-query-handler/ask-query-handler';
import { UpdateQueryHandler } from '../sparql-query-handler/update-query-handler';
import { ErrorQueryHandler } from '../sparql-query-handler/error-query-handler';
import { ConstructQueryHandler } from '../sparql-query-handler/construct-query-handler';
import { ShaclQueryHandler } from '../sparql-query-handler/shacl-query-handler';
import { writeError } from '../sparql-query-handler/helper/write-error';
import { SPARQLQueryKind } from '../const/enum/sparql-query-kind';
import { HttpErrorStatus, HttpSuccessStatus } from '../endpoint/const/http-status';
import { EndpointResolver } from './endpoint-resolver';
import { NotebookErrorRenderer } from './notebook-error-renderer';

export class SparqlNotebookController {
  readonly controllerId = `${extensionId}-controller-id`;
  readonly notebookType = extensionId;
  readonly label = "Sparql Notebook";
  readonly supportedLanguages = ["sparql", "shacl"];

  readonly #controller: NotebookController;
  #executionOrder = 0;

  private endpointResolver: EndpointResolver;
  private errorRenderer: NotebookErrorRenderer;

  constructor() {
    // Create a new notebook controller
    this.#controller = notebooks.createNotebookController(
      this.controllerId,
      this.notebookType,
      this.label
    );

    // controller setup
    this.#controller.supportedLanguages = this.supportedLanguages;
    this.#controller.supportsExecutionOrder = true;

    // this is executing the cells
    this.#controller.executeHandler = this.#execute.bind(this);

    this.endpointResolver = new EndpointResolver();
    this.errorRenderer = new NotebookErrorRenderer();
  }

  /**
   * Executes the given cells by calling the _doExecution method for each cell.
   * @param cells - The cells to execute.
   * @param _notebook - The notebook document containing the cells.
   * @param _controller - The notebook controller for the notebook document.
   */
  #execute(cells: NotebookCell[], _notebook: NotebookDocument, _controller: NotebookController): void {
    for (let cell of cells) {
      this.#executeCell(cell);
    }
  }


  async #executeCell(nbCell: NotebookCell): Promise<void> {

    const sparqlCell = new SparqlNotebookCell(nbCell);
    const languageId = nbCell.document.languageId;

    const execution = this.#controller.createNotebookCellExecution(sparqlCell.cell);
    execution.executionOrder = ++this.#executionOrder;
    execution.start(Date.now());

    const sparqlQuery = sparqlCell.sparqlQuery;
    const notebookUri = nbCell.notebook.uri;
    const sparqlEndpoint = await this.endpointResolver.getDocumentOrConnectionClient(sparqlQuery, notebookUri);

    if (sparqlEndpoint === null) {
      this.errorRenderer.showConnectionErrorMessage(sparqlQuery, execution);
      execution.end(false, Date.now());
      return;
    }

    let queryResult;

    if (languageId === "shacl") {
      // SHACL validation - use the raw text and call validate()
      const shaclText = nbCell.document.getText();
      queryResult = await sparqlEndpoint.validate(shaclText, execution).catch(
        (error) => {
          this.errorRenderer.showNetworkErrorMessage(error, execution);
          execution.end(false, Date.now());
          return undefined;
        });
    } else {
      // SPARQL query - use the SparqlQuery object
      queryResult = await sparqlEndpoint.query(sparqlQuery, execution).catch(
        (error) => {
          this.errorRenderer.showNetworkErrorMessage(error, execution);
          execution.end(false, Date.now());
          return undefined;
        });
    }

    if (!queryResult) {
      execution.replaceOutput([
        writeError('No result')
      ]);
      execution.end(false, Date.now());
      return;
    }

    if (queryResult.status === HttpErrorStatus.BadRequest) {
      this.errorRenderer.showHttpErrorMessage(queryResult, 'Bad Request', sparqlEndpoint, execution);
      execution.end(false, Date.now());
      return;
    }

    if (queryResult.status !== HttpSuccessStatus.OK && queryResult.status !== HttpSuccessStatus.NoContent) {
      this.errorRenderer.showHttpErrorMessage(queryResult, queryResult.statusText || 'Error', sparqlEndpoint, execution);
      writeError(`SPARQL query failed: ${queryResult.status ?? ''} ${queryResult.statusText ?? ''} ${queryResult.data ?? ''}`);
      execution.end(false, Date.now());
      return;
    }

    // Get the appropriate handler based on language or query type
    const handler = languageId === "shacl"
      ? new ShaclQueryHandler()
      : this.#getHandlerForType(sparqlQuery.kind);
    handler.handle(queryResult, sparqlCell, execution);
  }

  dispose() {
    this.#controller.dispose();
  }

  #getHandlerForType(type: string): SparqlQueryHandler {
    switch (type) {
      case SPARQLQueryKind.select: return new SelectQueryHandler();
      case SPARQLQueryKind.ask: return new AskQueryHandler();
      case SPARQLQueryKind.construct: return new ConstructQueryHandler();
      case SPARQLQueryKind.describe: return new ConstructQueryHandler();
      case SPARQLQueryKind.insert: return new UpdateQueryHandler();
      case SPARQLQueryKind.create: return new UpdateQueryHandler();
      case SPARQLQueryKind.drop: return new UpdateQueryHandler();
      case SPARQLQueryKind.clear: return new UpdateQueryHandler();
      case SPARQLQueryKind.delete: return new UpdateQueryHandler();
      case SPARQLQueryKind.load: return new UpdateQueryHandler();
      default: return new ErrorQueryHandler();
    }
  }

}
