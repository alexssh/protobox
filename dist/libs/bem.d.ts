type Modifiers = Record<string, string | boolean | undefined>;
/**
 * Generates BEM-style class names in the format Block[__Element][_modName-modVal or _modName]
 *
 * @param block - the block name
 * @param element - the element name (without __), if any
 * @param mods - an object with modifiers (string or boolean values)
 * @param extra - an array of additional class names
 * @returns a space-separated string of class names
 */
declare const bem: (block: string, element?: string, mods?: Modifiers, extra?: string[]) => string;
export { bem };
