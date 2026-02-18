/**
 * Declarative parameter definition API for Protobox apps.
 * Used by preview to render parameter UI and pass values to apps via postMessage.
 */
export type ParameterType = 'boolean' | 'number' | 'string' | 'option' | 'option-multi';
export interface OptionParam {
    type: 'option';
    key: string;
    label: string;
    default: string;
    options: Array<{
        value: string;
        label: string;
    }>;
}
export interface OptionMultiParam {
    type: 'option-multi';
    key: string;
    label: string;
    default: string[];
    options: Array<{
        value: string;
        label: string;
    }>;
}
export interface BooleanParam {
    type: 'boolean';
    key: string;
    label: string;
    default: boolean;
}
export interface NumberParam {
    type: 'number';
    key: string;
    label: string;
    default: number;
    min?: number;
    max?: number;
    step?: number;
}
export interface StringParam {
    type: 'string';
    key: string;
    label: string;
    default: string;
}
export type ParameterDefinition = BooleanParam | NumberParam | StringParam | OptionParam | OptionMultiParam;
export type ParameterValues = Record<string, boolean | number | string | string[]>;
/** Helper to define a boolean parameter */
export declare function paramBoolean(key: string, label: string, defaultValue: boolean): BooleanParam;
/** Helper to define a number parameter */
export declare function paramNumber(key: string, label: string, defaultValue: number, opts?: {
    min?: number;
    max?: number;
    step?: number;
}): NumberParam;
/** Helper to define a string parameter */
export declare function paramString(key: string, label: string, defaultValue: string): StringParam;
/** Helper to define a single-select option parameter */
export declare function paramOption(key: string, label: string, defaultValue: string, options: Array<{
    value: string;
    label: string;
}>): OptionParam;
/** Helper to define a multi-select option parameter */
export declare function paramOptionMulti(key: string, label: string, defaultValue: string[], options: Array<{
    value: string;
    label: string;
}>): OptionMultiParam;
/** Extract default values from parameter definitions */
export declare function getDefaultParameterValues(params: ParameterDefinition[]): ParameterValues;
