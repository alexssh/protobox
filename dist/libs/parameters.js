/**
 * Declarative parameter definition API for Protobox apps.
 * Used by preview to render parameter UI and pass values to apps via postMessage.
 */
/** Helper to define a boolean parameter */
export function paramBoolean(key, label, defaultValue) {
    return { type: 'boolean', key, label, default: defaultValue };
}
/** Helper to define a number parameter */
export function paramNumber(key, label, defaultValue, opts) {
    return {
        type: 'number',
        key,
        label,
        default: defaultValue,
        ...opts,
    };
}
/** Helper to define a string parameter */
export function paramString(key, label, defaultValue) {
    return { type: 'string', key, label, default: defaultValue };
}
/** Helper to define a single-select option parameter */
export function paramOption(key, label, defaultValue, options) {
    return { type: 'option', key, label, default: defaultValue, options };
}
/** Helper to define a multi-select option parameter */
export function paramOptionMulti(key, label, defaultValue, options) {
    return { type: 'option-multi', key, label, default: defaultValue, options };
}
/** Extract default values from parameter definitions */
export function getDefaultParameterValues(params) {
    const values = {};
    for (const p of params) {
        values[p.key] = p.default;
    }
    return values;
}
