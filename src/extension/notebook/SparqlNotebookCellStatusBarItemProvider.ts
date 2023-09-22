import {
    NotebookCellStatusBarItemProvider,
    EventEmitter,
    NotebookCell,
    CancellationToken,
    NotebookCellStatusBarItem,
    NotebookCellStatusBarAlignment
} from 'vscode';
import { CellContentStatusBarItem, ConnectionSourceStatusBarItem } from './sparql-notebook-cell-status-bar-item-provider';
import { SparqlNotebookCell } from './sparql-notebook-cell';


export class SparqlNotebookCellStatusBarItemProvider implements NotebookCellStatusBarItemProvider {
    private _onDidChangeCellStatusBarItems = new EventEmitter<void>();
    readonly onDidChangeCellStatusBarItems = this._onDidChangeCellStatusBarItems.event;

    provideCellStatusBarItems(cell: NotebookCell, token: CancellationToken): NotebookCellStatusBarItem[] {
        const sparqlCell = new SparqlNotebookCell(cell);


        const statusBarItems: NotebookCellStatusBarItem[] = [];

        statusBarItems.push(new ConnectionSourceStatusBarItem(sparqlCell, NotebookCellStatusBarAlignment.Right));
        statusBarItems.push(new CellContentStatusBarItem(sparqlCell, NotebookCellStatusBarAlignment.Right));
        return statusBarItems;
    }
}
