/**
 * @param {number} duration in seconds
 * @return {string}
 */
/*function formatDuration(duration) {
    const units = [['seconds', 60], ['minutes', 60], ['hours', 24], ['days', 100000000]];

    for (let i = 0; i < units.length; i++) {
        let unit = units[i];
        let nextUnit = units[i];

        if (duration / nextUnit[1] < 1) {
            return (duration).toFixed(2) + ' ' + unit[0]
        }

        duration /= nextUnit[1]
    }
}*/

/**
 * @param {{properties: Array<>, title: String}} schema
 * @param {Array<String>} pointer
 * @param {Element} containerElement
 */
export function bindSchema(schema, pointer, containerElement, onDataChanged) {
    const properties = schema.properties || [];

    if (pointer.length === 0) {
        containerElement.classList.add('formchen');
    }
    //const fieldset = document.createElement('fieldset');
    //const legend = document.createElement('legend');
    //legend.textContent = schema.title;
    //fieldset.appendChild(legend);

    const legend = document.createElement('h3');
    legend.textContent = schema.title;
    containerElement.appendChild(legend);

    for (let key in properties) {
        const childPointer = pointer.concat(key);
        const childSchema = properties[key];
        if ('editable' in schema) {
            // parent overrules
            childSchema.editable = schema.editable;
        }
        if (childSchema.type === 'object' && !childSchema.format) {
            bindSchema(childSchema, childPointer, containerElement, onDataChanged);
        } else {
            const label = document.createElement('label');
            let input;

            if (childSchema.type === 'boolean') {
                input = document.createElement('input');
                input.type = 'checkbox';
            } else if (childSchema.enum && childSchema.editable) {
                input = document.createElement('select');
                childSchema.enum.forEach(function (optionName) {
                    const option = document.createElement('option');
                    option.textContent = optionName;
                    input.appendChild(option);
                });
            } else {
                input = document.createElement('input');

                if (childSchema.type === 'number' || childSchema.type === 'integer') {
                    input.style.textAlign = 'right'
                }
            }

            input.disabled = !childSchema.editable;
            input.style.width = '30ex';
            input.id = containerElement.classList[0] + '/' + childPointer.join('/');

            input.onchange = function () {
                let newValue = input.value.trim();
                if (childSchema.type === 'array') {
                    newValue = newValue.split(',').map(function (item) {
                        return item.trim()
                    });
                } else if (childSchema.type === 'boolean') {
                    newValue = input.checked;
                } else if (childSchema.type === 'number' || childSchema.type === 'integer') {
                    if (newValue === '') {
                        newValue = null;
                    } else {
                        newValue = Number(newValue.replace(',', '.'));
                        if (isNaN(newValue)) {
                            throw Error('Invalid number: ' + input.value);
                        }
                        if (childSchema.unit === '%') {
                            newValue /= 100;
                        }
                    }
                }
                onDataChanged(childPointer, newValue);
            };

            const title = document.createElement('span');
            title.className = 'title';
            title.textContent = childSchema.title;
            label.appendChild(title);

            if (childSchema.unit) {
                const unit = document.createTextNode(' [' + childSchema.unit + ']');
                title.appendChild(unit);
            }

            label.appendChild(input);

            if (childSchema.comment) {
                label.title = childSchema.comment;
            }

            containerElement.appendChild(label);
        }
    }
}

/**
 * @param {{properties: Array<>, title: String}} schema
 * @param {Object} obj
 * @param {Array<String>} pointer
 * @param {Element} containerElement
 */
export function bindValue(schema, obj, pointer, containerElement) {
    const properties = schema.properties || [];

    for (let key in properties) {
        const childPointer = pointer.concat(key);
        const childSchema = properties[key];
        const value = obj?obj[key]:undefined;
        if (childSchema.type === 'object' && !childSchema.format) {
            bindValue(childSchema, value, childPointer, containerElement);
        } else {
            const id = containerElement.classList[0] + '/' + childPointer.join('/');
            let input = document.getElementById(id);
            if (!input) {
                // should never happen!
                console.error('No such element id: ' + id);
                continue
            }

            if (childSchema.type === 'boolean') {
                input.checked = value;
            } else {
                if ( value === undefined ) {
                    input.value = '';
                } else if (childSchema.unit === '%') {
                    input.value = String(100 * value);
                } else if (childSchema.format === 'date-time') {
                    input.value = new Date(value).toLocaleString();
                } else {
                    input.value = value;
                }
            }
        }
    }
}

/**
 * Disable all child buttons of the form
 * @param {HTMLElement} form
 */
export function disableButtons(form) {
    const buttons = form.querySelectorAll('button');
    for (let i=0; i<buttons.length; i++) {
        const button = /**@type{HTMLButtonElement}*/(buttons[i]);
        //button.dataset['orgDisabled'] = button.disabled;
        button.disabled = true;
    }
}

/**
 * Set the button to busy state.
 * @param {HTMLButtonElement} button
 */
export function busy(button) {
    // Remember idle text content.
    button.dataset['orgtextContent'] = button.textContent;
    button.textContent = '⌛';
}

/**
 * Enable all child buttons of the form
 * @param {HTMLElement} form
 */
export function enableButtons(form) {
    const buttons = form.querySelectorAll('button');
    for (let i=0; i<buttons.length; i++) {
        const button = buttons[i];
        if ('orgtextContent' in button.dataset) {
            button.textContent = button.dataset['orgtextContent'];
        }
        //if ('orgDisabled' in button.dataset) {
        //    button.disabled = button.dataset['orgDisabled'];
        //} else {
        button.disabled = false;
        //}
    }
}
