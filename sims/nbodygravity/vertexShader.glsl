#version 300 es
 
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
out vec4 texpos;

void main() {
    // gl_Position is a special variable a vertex shader
    // is responsible for setting
    // What this is doing is taking the positions of the vertices,
    // which are passed in JS, and placing them in front of the 
    // camera. 
    gl_Position = vec4(a_position.xy, 0, 1);
    texpos = (a_position);
}