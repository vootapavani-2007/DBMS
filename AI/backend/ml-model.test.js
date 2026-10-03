const assert = require("assert");
const { normalizeKey, predictTraffic, trainedModelAvailable } = require("./ml-model");

assert.strictEqual(normalizeKey(" Destination Port "), "destination_port");
assert.strictEqual(normalizeKey(" Label "), "label");

if (!trainedModelAvailable()) {
    assert.throws(() => predictTraffic({}), /trained CIC-IDS2017 model is required/i);
}

console.log("ML model contract tests passed.");
