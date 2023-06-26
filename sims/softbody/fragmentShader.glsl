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
uniform float timeStep;

uniform int confine;
uniform float G;
uniform vec2 randSeed;
uniform sampler2D u_texture;
uniform sampler2D u_conns;
uniform sampler2D u_conns2;
// uniform sampler2D masses_temps_maxcons_tarlengs_texture;

// we need to declare an output for the fragment shader
out vec4 outColor;

float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898 + randSeed.y, 78.233 - randSeed.y))) * (43758.5453 + randSeed.x));
}
float rand2(vec2 co) {
    return float(rand(vec2(rand(co) - rand(-co), rand(co))));
}
float forceProfile(float dist, float tdist, float repdist) {
    dist = (dist-tdist);
    if(dist<repdist){
        dist*=80.;
    }
    return -(springStrength*dist)/300.;
}
vec2 interact(float ID, vec2 size, int thisID, vec4 color){
    if (ID>-.5) {
        float x = mod(ID, size.x);
        float y = floor(ID/size.x);
        vec2 comppos;
        float d;
        comppos = texelFetch(u_texture, ivec2(x,y), 0).xy;
        d = forceProfile(distance(comppos, color.xy), 10., 4.);
        return (color.xy - comppos) * d;
    }
    else{return vec2(0.);}
}

void main() {
    int level = 0;
    vec2 size = vec2(textureSize(u_texture, level));
    float thisID = float(int(gl_FragCoord.x) + int(size.x)*(int(gl_FragCoord.y)));
    vec4 thisConnIDs = texelFetch(u_conns, ivec2(floor(gl_FragCoord.x), floor(gl_FragCoord.y)), 0);
    vec4 thisConnIDs2 = texelFetch(u_conns2, ivec2(floor(gl_FragCoord.x), floor(gl_FragCoord.y)), 0);

    vec4 color = texelFetch(u_texture, ivec2(gl_FragCoord.x, gl_FragCoord.y), 0);
    vec2 addVel = vec2(0., 0.);

    addVel += interact(thisConnIDs.x, size, int(thisID), color);
    addVel += interact(thisConnIDs.y, size, int(thisID), color);
    addVel += interact(thisConnIDs.z, size, int(thisID), color);
    addVel += interact(thisConnIDs.w, size, int(thisID), color);
    addVel += interact(thisConnIDs2.x, size, int(thisID), color);
    addVel += interact(thisConnIDs2.y, size, int(thisID), color);
    addVel += interact(thisConnIDs2.z, size, int(thisID), color);
    addVel += interact(thisConnIDs2.w, size, int(thisID), color);

    vec2 newVel = ((color.zw + (addVel*timeStep)))*(1.-dampFactor) + vec2(0., -(G/10.));
    if (color.y+newVel.y<0.){
        newVel.y = -newVel.y * .5;
    }
    outColor = vec4(color.xy+(newVel),newVel);
}