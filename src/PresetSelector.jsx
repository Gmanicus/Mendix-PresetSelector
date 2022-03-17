import { Component, createElement } from "react";

import "./ui/PresetSelector.css";
import { Big } from "big.js";

// Have two attribute selections
// When X equals Y
// X is a datasource attribute
// Y is an attribute from the dataview object
// When object/X equals Y, return the presetAttribute

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
        this.getTypeValue = this.getTypeValue.bind(this);
        this.debug = this.debug.bind(this);
    }

    debug(...args) {
        // if (this.props.name != "KeySelector") { return; }
        console.log(this.props.name, ...args);
    }

    setAttribute(e) {
        let valueData = JSON.parse(e.target.value);

        let value = valueData.value;
        switch (valueData.type) {
            case "Big": value = Big(value); break;
            case "Date": value = new Date(value); break;
            case "Boolean": value = Boolean(value); break;
        }

        this.props.targetAttribute.setValue(value);
        // If we've set the onChange action, execute it now
        if (this.props.onChange) { this.props.onChange.execute(); }
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

        
    // Get value data from an attribute
    // ○ ATTRIBUTE WITH VALUE
    //      Get type with constructor & formatter
    //      Get value from attribute
    // ○ DATASOURCE ATTRIBUTE • OBJECT WITH ATTRIBUTE
    //      Get type with .type
    //      Get value from object
    // No way to tell between AutoNumbers, Strings, Binary
    getTypeValue(attribute, object) {
        let data = {};
        if (!object) {  // If not an attribute on an object
            // this.debug("ATTRIBUTE VALUE", attribute);
            
            // If this is a boolean attribute
            if (attribute.universe && attribute.universe.includes(true)) {
                data.type = "Boolean";
                data.value = attribute.value
                data.textValue = (attribute.value) ? "Yes" : "No";
            } else {
                switch (attribute.formatter.type) {
                    case "number":
                        data.type = "Big";
                        data.value = Big(attribute.value);
                        data.textValue = data.value.toString();
                        break;
                    case "datetime":
                        data.type = "Date";
                        data.value = Date.parse(attribute.value);
                        data.textValue = attribute.value;
                        break;
                    default:
                        // Enumerations, AutoNumbers, Strings, and Binaries are all set as strings
                        data.type = "String";
                        data.value = (attribute.value) ? attribute.value : "";
                        data.textValue = (attribute.value) ? attribute.value : "None"
                        break;
                }
            }
        // this.debug(data);
        } else {
            let attributeValue = attribute.get(object).value;
            if (attributeValue == undefined || attributeValue == "") { return false; }  // Don't return undefined values or empty strings
            data.actualType = attribute.type;
            switch (attribute.type) {
                case "Integer":
                case "Decimal":
                case "Long":
                    data.type = "Big";
                    data.value = Big(attributeValue);
                    data.textValue = data.value.toString();
                    break;
                case "Boolean":
                    data.type = "Boolean";
                    data.value = attributeValue;
                    data.textValue = (attributeValue) ? "Yes" : "No";
                    break;
                case "DateTime":
                    data.type = "Date";
                    data.value = Date.parse(attributeValue);
                    data.textValue = attributeValue;
                    break;
                default:
                    // Enumerations, A̶u̶t̶o̶N̶u̶m̶b̶e̶r̶s̶, Strings, and Binaries are all set as strings
                    data.type = "String";
                    data.value = (attributeValue) ? attributeValue : "";
                    data.textValue = (attributeValue) ? attributeValue : "None"
                    break;
            }
        }
        return data;
    }
    
    componentDidMount() {
        // Get other selectors on the page
        let siblingSelectors = document.getElementsByClassName("preset-selector");
        // Give them an event listener to update the dropdown lists
        // This allows them to refresh based on their constraints in case their constraints are based on the value of the target object
        for (var i=0, selector; selector = siblingSelectors[i]; i++) {
            selector.addEventListener('input', () => {
                setTimeout( () => { this.setState({ refresh: true }) }, 5 ); // SetTimeout is used to have the components update after the value has changed
            })
        }
    }
    
    componentDidUpdate() {
        // If we haven't initialized and our properties have been updated and are available
        if ( this.state.refresh == true && this.props.presetObject.status === "available" && this.props.targetAttribute.status === "available") {
            // Validate our preset and target attribute types
            // if (!this.validateAttributeTypes() && !this.state.initialized) { return }

            // this.debug("Our props:", this.props);
            
            let attributesToAdd = [];
            if (this.props.constraint) { // If the dev set a constraint
                for (let object of this.props.presetObject.items) {
                    let constraintResult = this.props.constraint.get(object);
                    
                    if (constraintResult.value) {  // If this item passes our constraint
                        attributesToAdd.push(object);
                    }
                }
            } else {
                attributesToAdd = this.props.presetObject.items;
            }

            // If we want to remove duplicates from the list
            if (!this.props.allowDuplicates) {
                let uniqueAttributes = []; // initialize
                uniqueAttributes = attributesToAdd.filter((object) => {
                    let thisAttribute = this.props.presetAttribute.get(object).value;

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
            let attributes = attributesToAdd.map((object) => {
                // this.debug("Object:", object);
                let valueData = this.getTypeValue(this.props.presetAttribute, object);
                let payload = {
                    value: valueData.value,
                    type: valueData.type
                }
                if (valueData) { return <option value={JSON.stringify(payload)} type={valueData.type}>{`${valueData.textValue}`}</option>; }
            });

            let shouldDisable = false;
            if (attributes.length == 0) { shouldDisable = true; }

            this.setState({
                refresh: false,
                disabled: shouldDisable,
                options: [<option value={null}></option>].concat(attributes), // Add an empty option 
            });
        }
    }

    render() {
        // If the value of targetAttribute is already set and has the same value, we want to default to this option in the drop-down
        let selectedValueData = this.getTypeValue( this.props.targetAttribute );
        let payload = {
            value: selectedValueData.value,
            type: selectedValueData.type
        }
        return (<select className="form-control preset-selector" value={JSON.stringify(payload)} onChange={this.setAttribute} disabled={this.state.disabled}>{this.state.options}</select>)
    }
}
