export const OPACITY_ATTRIBUTE = "aOpacity";
export const OPACITY_EPSILON = 0.01;

export function opacityVertexShader(vertexShader) {
  return `attribute float ${OPACITY_ATTRIBUTE};\nvarying float vOpacity;\n${vertexShader}`.replace(
    "#include <begin_vertex>",
    `#include <begin_vertex>\nvOpacity = ${OPACITY_ATTRIBUTE};`,
  );
}

export function opacityFragmentShader(fragmentShader) {
  return `varying float vOpacity;\n${fragmentShader}`.replace(
    "#include <dithering_fragment>",
    `#include <dithering_fragment>\ngl_FragColor.a *= vOpacity;\nif (gl_FragColor.a < ${OPACITY_EPSILON}) discard;`,
  );
}
