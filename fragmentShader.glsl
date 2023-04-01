#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
// taking new color from the vert shader
in vec4 texpos;

// the texture which will contain the input data
uniform vec4 confinementArea;
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
void main() {
    // Just set the output to a color
    // 
    // vec4(rand(new_color.xy),0,0,0)
    int level = 0;
    ivec2 size = textureSize(u_texture, level);
    vec4 color = vec4(0);
    color = texelFetch(u_texture, ivec2(gl_FragCoord.x, gl_FragCoord.y), level);
    if (color.x < confinementArea.x || color.x > confinementArea.y) {
        color.z = -color.z;
    }
    if (color.y < confinementArea.z || color.y > confinementArea.w) {
        color.w = -color.w;
    }
    vec2 addVel = vec2(0);
    for (int x=0; x<size.x; x++) {
        for (int y=0; y<size.y; y++) {
            if (y != int(gl_FragCoord.y) && x!= int(gl_FragCoord.x)) {
                vec2 compCoord = texelFetch(u_texture, ivec2(x, y), 0).xy;
                float dist = distance(compCoord.xy, color.xy);
                addVel += vec2(compCoord.x-color.x, compCoord.y-color.y) / (dist*dist*dist);
            }
        }
    }
    outColor = color + vec4(color.zw, addVel / 2000.);
}