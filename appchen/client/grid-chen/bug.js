
/** @type {GridChenNS.JSONPatchOperation} */
const operation = {op: 'remove', path: '', oldValue: rows};

/** @returns {GridChenNS.JSONPatchOperation[]} */
function creator() {
    return [{op: 'remove', path: '', oldValue: null}]
}

/**
 * @returns {GridChenNS.JSONPatchOperation[]}
 */
function removeModel() {
    return [{op: 'remove', path: '', oldValue: rows}];
}