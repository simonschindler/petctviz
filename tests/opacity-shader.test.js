import { describe, expect, it } from "vitest";

import { opacityFragmentShader, opacityVertexShader } from "../src/scene/opacity-shader.js";

const VERTEX = "void main() {\n#include <begin_vertex>\n}";
const FRAGMENT = "void main() {\n#include <dithering_fragment>\n}";

describe("opacityVertexShader", () => {
  it("injects the per-instance opacity attribute and varying", () => {
    const out = opacityVertexShader(VERTEX);
    expect(out).toContain("attribute float aOpacity");
    expect(out).toContain("varying float vOpacity");
    expect(out).toContain("vOpacity = aOpacity");
  });
});

describe("opacityFragmentShader", () => {
  it("multiplies the fragment alpha by the per-instance opacity", () => {
    expect(opacityFragmentShader(FRAGMENT)).toContain("gl_FragColor.a *= vOpacity");
  });

  it("discards fully faded fragments so they cannot write depth", () => {
    expect(opacityFragmentShader(FRAGMENT)).toContain("if (gl_FragColor.a < 0.01) discard;");
  });
});
