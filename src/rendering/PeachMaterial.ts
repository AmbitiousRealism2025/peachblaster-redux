import * as THREE from "three";

const vertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

	void main() {
	  vUv = uv;

	  // Apply instance matrix to position BEFORE model-view transform
	  vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
	  vec4 mvPosition = modelViewMatrix * instancePosition;
	  vViewPosition = -mvPosition.xyz;

	  // Transform normal by instance rotation for correct per-instance lighting
	  mat3 instanceNormalMatrix = mat3(instanceMatrix);
	  vec3 transformedNormal = instanceNormalMatrix * normal;
	  vNormal = normalize(normalMatrix * transformedNormal);

  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform vec3 uBaseColor;
uniform vec3 uFuzzColor;
uniform vec3 uGlossColor;
uniform float uFuzzPower;
uniform float uGlossPower;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vec2 centeredUv = vUv - vec2(0.5);
  float dist = length(centeredUv) * 2.0;
  float radial = smoothstep(0.0, 1.0, dist);
  vec3 base = mix(uBaseColor * 0.85, uBaseColor, radial);

  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  vec3 lightDir = normalize(vec3(0.6, 1.0, 0.8));

  float diffuse = max(dot(normal, lightDir), 0.0);

  float fresnel =
    pow(1.0 - max(dot(normal, viewDir), 0.0), uFuzzPower);
  vec3 fuzz = uFuzzColor * fresnel;

  vec3 halfDir = normalize(lightDir + viewDir);
  float specular =
    pow(max(dot(normal, halfDir), 0.0), uGlossPower);
  vec3 gloss = uGlossColor * specular;

  vec3 color = base * (0.4 + 0.6 * diffuse) + fuzz + gloss;
  gl_FragColor = vec4(color, 1.0);
}
`;

export function createPeachMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: new THREE.Color("#FF9966") },
      uFuzzColor: { value: new THREE.Color("#FFCC99") },
      uGlossColor: { value: new THREE.Color("#FFFFFF") },
      uFuzzPower: { value: 2.5 },
      uGlossPower: { value: 32.0 }
    },
    vertexShader,
    fragmentShader
  });
}
