import { paramBoolean, paramNumber, paramString } from "protobox/parameters"

export default {
  title: "Chart",
  description: "Chart app with Dashboard and Report views",
  parameters: [
    paramBoolean("showGrid", "Show grid", true),
    paramString("title", "Chart title", "Chart"),
    paramNumber("refreshInterval", "Refresh (s)", 30),
  ],
}
