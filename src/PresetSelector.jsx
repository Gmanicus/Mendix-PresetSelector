import { Component, createElement } from "react";

import { HelloWorldSample } from "./components/HelloWorldSample";
import "./ui/PresetSelector.css";

export default class PresetSelector extends Component {
    constructor(props) {
        super(props);
        this.state = {
            initialized: false,
            refresh: true,
            disabled: true,
            options: [<option value={null}></option>]
        };

        this.setAttribute = this.setAttribute.bind(this);
        this.validateAttributeTypes = this.validateAttributeTypes.bind(this);
    }

    setAttribute(e) {
        this.props.targetAttribute.setValue(e.target.value);
        if (this.props.onChange) {  // If we've set the onChange action, execute it now
            this.props.onChange.execute();
        }
    }

    validateAttributeTypes() {
        // Get current value and a test value from the list of presets
        let trueValue = this.props.targetAttribute.value;
        let testValue = this.props.presetAttribute.get(
            this.props.presetObject.items[0]
        ).value

        let valid = true;

        try {
            this.props.targetAttribute.setValue(testValue);                 // Attempt to set our target attribute to a preset
        } catch (e) {                                                       // If it fails, it must not be of the right type
            alert(`\n${e}\n\nPreset Selector preset and target attributes must be of the same type.`)
            valid = false;
        }

        this.props.targetAttribute.setValue(trueValue); // Set targetAttribute back to the right value
        this.setState({ initialized: true });

        return valid;
        // I truly do wish there were a better way to do this, but Mendix does not provide the attribute type for non-datasource attributes
        // So, I have to rely on this workaround to test whether the attribute types are correct
    }

    componentDidMount() {
        // Get other selectors on the page
        let siblingSelectors = document.getElementsByClassName("preset-selector");
        // Give them an event listener to update the dropdown lists
        // This allows them to refresh based on their constraints in case their constraints are based on the value of the target object
        for (var i=0, selector; selector = siblingSelectors[i]; i++) {
            selector.addEventListener('input', () => {
                setTimeout( () => {
                    this.setState({ refresh: true })
                }, 5 ); // SetTimeout is used to have the components update after the value has changed
            })
        }
    }

    componentDidUpdate() {
        // If we haven't initialized and our properties have been updated and are available
        if ( this.state.refresh == true && this.props.presetObject.status === "available" && this.props.targetAttribute.status === "available") {
            // Validate our preset and target attribute types
            if (!this.validateAttributeTypes() && !this.state.initialized) { return }

            let attributesToAdd = []
            if (this.props.constraint) { // If the dev set a constraint
                for (let item of this.props.presetObject.items) {
                    if (this.props.constraint.get(item).value) {  // If this item passes our constraint
                        attributesToAdd.push(item);
                    }
                }
            } else {
                attributesToAdd = this.props.presetObject.items;
            }

            // If we want to remove duplicates from the list
            if (!this.props.allowDuplicates) {
                let uniqueAttributes = []; // initialize
                uniqueAttributes = attributesToAdd.filter((item) => {
                    let thisAttribute = this.props.presetAttribute.get(item).value;
                    if (!uniqueAttributes.includes(thisAttribute)) { // if this attribute is unique
                        uniqueAttributes.push(thisAttribute);
                        return true; // pass filter
                    } else {
                        return false // catch in filter
                    }
                });

                // Replace list with the unique attributes
                attributesToAdd = uniqueAttributes;
            }

            // Map attributes to a list of option elements
            let attributes = attributesToAdd.map((item) => {
                let thisAttribute = this.props.presetAttribute.get(item).value;
                // If the value of targetAttribute is already set and has the same value, we want to default to this option in the drop-down
                return <option value={thisAttribute}>{thisAttribute}</option>;
            });

            let shouldDisable = false;
            if (attributes.length == 0) { shouldDisable = true; }

            this.setState({
                refresh: false,
                disabled: shouldDisable,
                options: [<option value={null}></option>].concat(attributes) // Add an empty option 
            });
        }
    }

    render() {
        return (
            <select className="form-control preset-selector" value={this.props.targetAttribute.value} onChange={this.setAttribute} disabled={this.state.disabled}>{this.state.options}</select>
        )
    }
}
