import { paramBoolean, paramNumber, paramString } from "proto/parameters"

export default {
  title: "Demo",
  description: "Demo app for Proto framework",
  parameters: [
    paramBoolean("enabled", "Enabled", true),
    paramString("name", "Name", "Demo"),
    paramNumber("count", "Count", 10, { min: 0, max: 100 }),
  ],
}
