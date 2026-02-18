/**
 * Protobox libs - tree-shakable utilities for React prototypes.
 * Import from "protobox", "protobox/context", "protobox/parameters", or "protobox/useProtoParams".
 */

export { createProtoContext, type CreateProtoContextOptions, type ProtoContextValue } from './context'

export {
  paramBoolean,
  paramNumber,
  paramString,
  paramOption,
  paramOptionMulti,
  getDefaultParameterValues,
  type ParameterDefinition,
  type ParameterValues,
  type BooleanParam,
  type NumberParam,
  type StringParam,
  type OptionParam,
  type OptionMultiParam,
  type ParameterType,
} from './parameters.js'

export { useProtoParams } from './useProtoParams.js'
