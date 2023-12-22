
export abstract class Endpoint {
    public abstract url: string;
    abstract query(sparqlQuery: string, execution?: any): Promise<any>;
    abstract validate(shaclGraphAsTurtle: string, execution?: any): Promise<any>;
}

class EndpointController {
    private _endpoint: Endpoint | null = null;

    constructor() { }

    getEndpoint(): Endpoint | null {
        return this._endpoint;
    }

    setEndpoint(endpoint: Endpoint | null) {
        this._endpoint = endpoint;
    }
}

export const notebookEndpoint = new EndpointController();