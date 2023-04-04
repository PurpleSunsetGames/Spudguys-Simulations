#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
// taking new color from the vert shader
in vec4 texpos;

// the texture which will contain the input data
uniform vec4 confinementArea;
uniform int confine;
uniform float G;
uniform vec2 randSeed;
uniform sampler2D u_texture;
// we need to declare an output for the fragment shader
out vec4 outColor;
float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898 + randSeed.y, 78.233 - randSeed.y))) * (43758.5453 + randSeed.x));
}
float rand2(vec2 co) {
    return float(rand(vec2(rand(co) - rand(-co), rand(co))));
}
float forceProfile(float dist) {
    dist = dist + .01;
    return 1./abs(dist*dist*dist);
}
void main() {
    int level = 0;
    ivec2 size = textureSize(u_texture, level);
    ivec2 thisPos = ivec2(gl_FragCoord.x, gl_FragCoord.y);
    vec4 color = vec4(0);
    color = texelFetch(u_texture, thisPos, level);
    if (confine == 1) {
        if (color.x < confinementArea.x || color.x > confinementArea.y) {
            color.z = -.95 * color.z;
        }
        if (color.y < confinementArea.z || color.y > confinementArea.w) {
            color.w = -.95 * color.w;
        }
    }
    vec2 addVel = vec2(0);

    for (int x=0; x<size.x; x++){
        for (int y=0; y<size.y; y++) {
            vec2 comppos = texelFetch(u_texture, ivec2(x,y),0).xy;
            float d = forceProfile(distance(comppos, color.xy)+1.);
            addVel += (comppos - color.xy) * d * G;
        }
    }

    vec2 newVel = (color.zw + addVel);

    outColor = vec4(color.xy+color.zw,newVel);
}