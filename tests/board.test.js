
+const test = require('node:test');
+const assert = require('node:assert');
+
+const boardModule = import('../src/board.js');
+
+test('inputs 0 and 64 return 0', async () => {
+  const { decodeRelative7 } = await boardModule;
+  assert.strictEqual(decodeRelative7(0), 0);
+  assert.strictEqual(decodeRelative7(64), 0);
+});
+
+test('inputs 1..63 produce positive steps', async () => {
+  const { decodeRelative7 } = await boardModule;
+  for (let v = 1; v <= 63; v++) {
+    assert.ok(decodeRelative7(v) > 0);
+  }
+});
+
+test('inputs 65..127 produce negative steps', async () => {
+  const { decodeRelative7 } = await boardModule;
+  assert.strictEqual(decodeRelative7(65), -63);
+  for (let v = 65; v <= 127; v++) {
+    assert.ok(decodeRelative7(v) < 0);
+  }
+});
