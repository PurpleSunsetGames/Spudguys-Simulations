#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
// taking new color from the vert shader
in vec4 texpos;

// the texture which will contain the input data
uniform vec4 confinementArea;
uniform float dampFactor;
uniform float springStrength;

uniform int confine;
uniform float G;
uniform vec2 randSeed;
uniform sampler2D u_texture;
uniform sampler2D u_conns;
// uniform sampler2D masses_temps_maxcons_tarlengs_texture;

// we need to declare an output for the fragment shader
out vec4 outColor;

float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898 + randSeed.y, 78.233 - randSeed.y))) * (43758.5453 + randSeed.x));
}
float rand2(vec2 co) {
    return float(rand(vec2(rand(co) - rand(-co), rand(co))));
}
float forceProfile(float dist, float tdist) {
    dist = (dist-tdist);
    if (abs(dist) > 100.) {dist=0.;}
    return springStrength*dist/50.;
}
void main() {
    int level = 0;
    ivec2 size = textureSize(u_texture, level);
    ivec2 thisPos = ivec2(gl_FragCoord.x, gl_FragCoord.y);
    vec4 color = vec4(0.);
    color = texelFetch(u_texture, thisPos, level);
    vec2 addVel = vec2(0., 0.);

    for (int x=thisPos.x-1; x<=min(thisPos.x+1, size.x); x++){
        for (int y=thisPos.y-1; y<=min(thisPos.y+1, size.y); y++) {
            if(x>=0 && y>=0 && !(y==thisPos.y && x==thisPos.x)) {
                vec2 comppos = texelFetch(u_texture, ivec2(x,y),0).xy;
                float d = forceProfile(distance(comppos, color.xy), 10.*distance(vec2(thisPos), vec2(x,y)));
                addVel += (comppos - color.xy) * d;
            }
        }
    }
    vec2 newVel = (color.zw + addVel)*(1.-dampFactor) + vec2(0., -G);
    if (color.y+newVel.y<0.){
        newVel.y = -newVel.y * .5;
        newVel.x = newVel.x*.8;
    }
    if (abs(newVel.y) > 1.) {

    }
    outColor = vec4(color.xy+newVel,newVel);
}