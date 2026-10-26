import assert from "node:assert/strict";
import test from "node:test";
import { isSupportedImageUploadSize, MAX_IMAGE_BYTES } from "./image-upload-policy";

test("Transmission images accept the supported maximum size and reject larger inputs", () => {
  assert.equal(isSupportedImageUploadSize(MAX_IMAGE_BYTES), true);
  assert.equal(isSupportedImageUploadSize(MAX_IMAGE_BYTES + 1), false);
  assert.equal(isSupportedImageUploadSize(0), true);
  assert.equal(isSupportedImageUploadSize(-1), false);
  assert.equal(isSupportedImageUploadSize(Number.POSITIVE_INFINITY), false);
});
