uniform sampler2D tDiffuse;
uniform vec3 lift;
uniform vec3 gamma;
uniform vec3 gain;

varying vec2 vUv;

void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    // Apply gamma
    color.rgb = pow(color.rgb, vec3(1.0 / (gamma + 2.2)));

    // Apply lift
    color.rgb = color.rgb * (1.5 - 0.5 * lift) + 0.5 * lift - 0.5;

    // Apply gain
    color.rgb = color.rgb * gain;

    gl_FragColor = color;
}
