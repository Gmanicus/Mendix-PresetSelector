import { Component, createElement } from "react";

export class preview extends Component {
    render() {
        return <select className="form-control"><option>Sample Text</option></select>;
    }
}

export function getPreviewCss() {
    return require("./ui/PresetSelector.css");
}
