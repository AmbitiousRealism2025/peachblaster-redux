import { CHROMATIC_ABERRATION_OFFSET } from "../config/tuning";

export const ChromaticAberrationShader = {
  name: "ChromaticAberrationShader",
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: CHROMATIC_ABERRATION_OFFSET }
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

    varying vec2 vUv;

    void main() {
      vec2 fromCenter = vUv - vec2(0.5, 0.5);
      float distanceFromCenter = length(fromCenter);

      vec2 direction = vec2(0.0, 0.0);
      if (distanceFromCenter > 0.000001) {
        direction = fromCenter / distanceFromCenter;
      }

      vec2 offsetVec = direction * offset;

      vec2 uvRed = clamp(vUv + offsetVec, 0.0, 1.0);
      vec2 uvGreen = clamp(vUv, 0.0, 1.0);
      vec2 uvBlue = clamp(vUv - offsetVec, 0.0, 1.0);

      vec4 sampleRed = texture2D(tDiffuse, uvRed);
      vec4 sampleGreen = texture2D(tDiffuse, uvGreen);
      vec4 sampleBlue = texture2D(tDiffuse, uvBlue);

      gl_FragColor = vec4(sampleRed.r, sampleGreen.g, sampleBlue.b, sampleGreen.a);
    }
  `
};
