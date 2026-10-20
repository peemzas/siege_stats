import assert from "node:assert/strict";
import test from "node:test";
import { previewLog } from "./preview";

const SAMPLE = `[20:20:45] [Wazabz่] Kalgas #89AE0 (Blade) → Attack [OracIe] MirandaDoctrine #180012
+4 +2

[20:21:10] [OracIe] BNE #14F93D (Ranger) → Attack [Wazabz่] Kalgas #89AE0
+8
`;

test("preview keeps stored guild names and rejects a chat log", () => {
  const preview = previewLog(SAMPLE);
  assert.equal(preview.ok, true);
  if (!preview.ok) return;
  assert.deepEqual(
    preview.model.guilds.map((guild) => guild.name),
    ["OracIe", "Wazabz่"],
  );
  assert.equal(preview.model.totalKills, 2);

  const rejected = previewLog("Guild chat …\nhello");
  assert.equal(rejected.ok, false);
  if (rejected.ok) return;
  assert.equal(rejected.message, "No kill lines found.");
  assert.equal(rejected.sample, "Guild chat …");
});
