import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sha256, sourceHash, toHex } from "./hash";

const nodeSha = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

describe("sha256 fallback", () => {
  it("matches the FIPS test vectors", () => {
    const enc = new TextEncoder();
    expect(toHex(sha256(enc.encode("")))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(toHex(sha256(enc.encode("abc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it.each([
    "é",
    "int main(void) { return 0; }\n",
    "printf(\"héllo 😀\\n\");\r\n",
    "x".repeat(55), // padding edge: 55 + 1 + 8 = 64 bytes
    "y".repeat(56), // needs a second block for the length
    "z".repeat(1000),
  ])("agrees with Node's crypto for %j", (text) => {
    expect(toHex(sha256(new TextEncoder().encode(text)))).toBe(nodeSha(text));
  });
});

describe("sourceHash", () => {
  it("uses the same format as the API (sha256:<hex>)", async () => {
    // The API computes: "sha256:" + hashlib.sha256(source.encode("utf-8")).hexdigest()
    expect(await sourceHash("é")).toBe(`sha256:${nodeSha("é")}`);
  });
});
