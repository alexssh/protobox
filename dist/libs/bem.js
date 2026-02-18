const bem = (block, element, mods = {}, extra = []) => {
  const base = element ? `${block}__${element}` : block;
  const classList = [base];
  for (const [key, value] of Object.entries(mods)) {
    if (typeof value === "string") {
      classList.push(`${base}_${key}-${value}`);
    } else if (value === true) {
      classList.push(`${base}_${key}`);
    }
  }
  return classList.concat(extra).join(" ");
};
export {
  bem
};
//# sourceMappingURL=bem.js.map
