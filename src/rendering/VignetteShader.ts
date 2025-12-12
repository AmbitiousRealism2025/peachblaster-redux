import { VIGNETTE_DARKNESS, VIGNETTE_OFFSET } from "../config/tuning";

export const VignetteShader = {
  name: "VignetteShader",
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: VIGNETTE_OFFSET },
    darkness: { value: VIGNETTE_DARKNESS }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;

    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      float clampedOffset = clamp(offset, 0.0, 1.0);
      float clampedDarkness = max(darkness, 0.0);

      vec2 centeredUv = vUv - vec2(0.5, 0.5);
      float dist = length(centeredUv) * 1.41421356237;
      float vignette = smoothstep(clampedOffset, 1.0, dist);

      float factor = 1.0 - vignette * clampedDarkness;
      factor = clamp(factor, 0.0, 1.0);

      color.rgb *= factor;
      gl_FragColor = color;
    }
  `
};
