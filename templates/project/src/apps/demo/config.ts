import { paramBoolean, paramNumber, paramString } from "protobox/parameters"

export default {
  title: "Demo",
  description: "Demo app for Protobox framework",
  parameters: [
    paramBoolean("enabled", "Enabled", true),
    paramString("name", "Name", "Demo"),
    paramNumber("count", "Count", 10, { min: 0, max: 100 }),
  ],
}
