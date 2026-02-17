function paramBoolean(key, label, defaultValue) {
  return { type: "boolean", key, label, default: defaultValue };
}
function paramNumber(key, label, defaultValue, opts) {
  return {
    type: "number",
    key,
    label,
    default: defaultValue,
    ...opts
  };
}
function paramString(key, label, defaultValue) {
  return { type: "string", key, label, default: defaultValue };
}
function paramOption(key, label, defaultValue, options) {
  return { type: "option", key, label, default: defaultValue, options };
}
function paramOptionMulti(key, label, defaultValue, options) {
  return { type: "option-multi", key, label, default: defaultValue, options };
}
function getDefaultParameterValues(params) {
  const values = {};
  for (const p of params) {
    values[p.key] = p.default;
  }
  return values;
}
export {
  getDefaultParameterValues,
  paramBoolean,
  paramNumber,
  paramOption,
  paramOptionMulti,
  paramString
};
//# sourceMappingURL=parameters.js.map
