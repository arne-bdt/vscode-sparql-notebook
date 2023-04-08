import * as vscode from "vscode";
import * as path from "path";
import { EndpointConfiguration } from "./endpoint-configuration.model";


export class EndpointConnectionListItem extends vscode.TreeItem {
    constructor(
        public readonly config: EndpointConfiguration,
        public readonly isActive: boolean,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(config.name, collapsibleState);

        if (isActive) {
            this.iconPath = {
                dark: path.join(assetsPath, "dark", "endpoint-connected.svg"),
                light: path.join(assetsPath, "light", "endpoint-connected.svg"),
            };
            this.description = "Connected";
        } else {
            this.iconPath = {
                dark: path.join(assetsPath, "dark", "endpoint.svg"),
                light: path.join(assetsPath, "light", "endpoint.svg"),
            };
            this.description = "Inactive";
        }
        this.contextValue = "database";
    }
}

export const assetsPath = path.join(__filename, "..", "..", "assets");