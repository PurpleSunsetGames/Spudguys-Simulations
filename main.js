'use strict';
let canvas = document.getElementById("mainCanvas");
let canvas2 = document.getElementById("otherCanvas");
let vertexShaderSource = "";
let fragmentShaderSource = "";
async function getFragShad() {
    fragmentShaderSource = await fetch("fragmentShader.glsl").then(result=>result.text());
    vertexShaderSource = await fetch("vertexShader.glsl").then(result=>result.text());
    mainGl(canvas);
}
getFragShad();

function mainGl(canvas) {
    let gl = canvas.getContext("webgl2");
    let ext = gl.getExtension("EXT_color_buffer_float");
    if (!ext) {
        alert("nope");
    }
    
    let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    let program = createProgram(gl, vertexShader, fragmentShader);
    gl.linkProgram(program);

    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
    //Find attribute positions
    let positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    
    //making the position buffer
    let positionBuffer = gl.createBuffer(); 
    //assigning it to the "ARRAY_BUFFER" bind point
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); 
    let positions = [
        -1, -1,
        -1, 1,
        1, -1,
        -1, 1,
        1, -1,
        1, 1
    ];
    // Passing data to the ARRAY_BUFFER bind point AKA "positionBuffer"
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);  

    // making the vertex array object
    let vao = gl.createVertexArray();
    // setting it as the current vertex array
    gl.bindVertexArray(vao);
    // turn on the attribute "a_position" and 
    // then specify how the shader program will get the data out
    gl.enableVertexAttribArray(0);
    let size = 2;          // 2 components per iteration
    let type = gl.FLOAT;   // the data is 32bit floats
    let normalize = false; // don't normalize the data
    let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    let offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        0, size, type, normalize, stride, offset);
    
    gl.viewport(0, 0, 256, 256);
    gl.clearColor(0, 0, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    let primitiveType = gl.TRIANGLES;
    let count = 6;


    // everything in the below area is for setting up the input and output texture arrays
    /// ------------------------------- ///

    // Make and use the input texture
    let inputTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    let inputTextureUniformLocation = gl.getUniformLocation(program, "u_texture");

    let data = [];
    const width = 100;
    const height = 100;
    const startRotVel = .02;

    for (let i=0; i<width; i++) {
        for (let i2=0; i2<height; i2++) {
            let tempx = (i-width/2) / width;
            let tempy = (i2-height/2) / height;
            let dist = Math.sqrt(Math.abs(Math.pow(tempx, 2) + Math.pow(tempy, 2)));
            if(dist===0) {dist=1}
            let a;
            if (tempx<0) {
                a = Math.atan2(tempy, tempx);
            }
            else {
                a = Math.atan2(tempy, tempx);
            }
            data.push((i2/width)*canvas2.width, 
                     (i/height)*canvas2.height, 
                     -(Math.cos(a)/(dist**2)) * startRotVel, 
                     (Math.sin(a)/(dist**2)) * startRotVel);
        }
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,
                  width, height, 0,
                  gl.RGBA, gl.FLOAT, new Float32Array(data));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //gl.drawArrays(primitiveType, offset, count);



    // start making the output texture
    let targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);

    const level = 0;
    const internalFormat = gl.RGBA32F;
    const border = 0;
    const format = gl.RGBA;
    const typel = gl.FLOAT;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                    width, height, border,
                    format, typel, null);
    
    // set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Create and bind the framebuffer
    const fb = gl.createFramebuffer();    
    // attach the texture as the first color attachment of fb
    // after this point, all function relating to framebuffers will reference
    // whichever framebuffer is bound to the gl.FRAMBUFFER bind point.
    // the texture is attached to the FRAMEBUFFER at COLOR_ATTACHMENT0
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);
    // Bind the inputTexture to texture unit 5, which has been associated with uniform input "u_texture" using uniform1i(location of u_texture, 5)
    // it is also associated with gl.TEXTURE_2D, which is why we are able to update it later
    let inde = 5;
    gl.activeTexture(gl.TEXTURE0+inde);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.uniform1i(inputTextureUniformLocation, inde)

    /// ------------------------------- ///

    // Everything should be bound properly now. Time to start actually rendering stuff to the texture
    let outData = new Float32Array(width*height*4);

    let num = 1;
    let ctx = canvas2.getContext("webgl2");
    let dotsProgram = dotsProgramGPU(ctx);
    // some uniforms for the main program
    let confinementAreaLocation = gl.getUniformLocation(program, "confinementArea");
    let randomSeedLocation = gl.getUniformLocation(program, "randSeed");
    let confineLocation = gl.getUniformLocation(program, "confine");
    let GLocation = gl.getUniformLocation(program, "G");
    let confine = 0;
    let G = .01;
    gl.uniform1i(confineLocation, confine);
    gl.uniform1f(GLocation, G);

    // uniforms and parameters for the dotsProgram
    let averagePosCenter = 1;


    let colors = [];
    for (let i=0; i<width; i++) {
        for (let i2=0; i2<height; i2++) {
            colors.push(i2/width, 0, (i/height), 1);
        }
    }
    drawLoop();    
    function drawLoop() {
        // render to target texture by binding the frame buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        // Set the uniform parameters and run the program
        gl.uniform4f(confinementAreaLocation, 0, canvas2.width, 0, canvas2.height);
        gl.uniform2f(randomSeedLocation, Math.random(), Math.random());
        gl.drawArrays(primitiveType, offset, count);

        // finally, retrieve data from the fb and send it to outData as a js array
        gl.readPixels(0, 0, width, height, format, typel, outData);
        // use that js array to update the data of the input texture
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat,
                      width, height, 0,
                      format, typel, outData);
        requestAnimationFrame(drawLoop);
        
        // draw dots on canvas based on that data
        //let ctx = canvas2.getContext("2d");
        //ctx.fillStyle = "black";
        //ctx.fillRect(0,0,canvas2.width,canvas2.height);
        //drawDots(outData, ctx);
        drawDotsGPU(outData, ctx, dotsProgram, colors, averagePosCenter);
        num++;
    }
}
const TAU = 2*Math.PI;

function drawDotsGPU(data,gl,prog,colors, averagePosCenter) {
    const a_PositionIndex = gl.getAttribLocation(prog, 'a_Position')
    const a_ColorIndex = gl.getAttribLocation(prog, 'a_Color')
    
    // Set up attribute buffers
    const a_PositionBuffer = gl.createBuffer()
    const a_ColorBuffer = gl.createBuffer()
    
    // Set up a vertex array object
    // This tells WebGL how to iterate your attribute buffers
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao);
    
    // Pull 2 floats at a time out of the position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, a_PositionBuffer);
    gl.enableVertexAttribArray(a_PositionIndex);
    gl.vertexAttribPointer(a_PositionIndex, 4, gl.FLOAT, false, 0, 0);
    
    // Pull 4 floats at a time out of the color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, a_ColorBuffer);
    gl.enableVertexAttribArray(a_ColorIndex);
    gl.vertexAttribPointer(a_ColorIndex, 4, gl.FLOAT, false, 0, 0);
    let newdata = [];
    let i = 0;
    let totX = 0;
    let totY = 0;
    if (averagePosCenter === 1) {
        while (i<data.length) {
            totX += data[i];
            totY += data[i+1];
            i += 4;
        }
        totX = totX / (data.length / 4);
        totY = totY / (data.length / 4);
    }
    i=0;
    while (i<data.length) {
        newdata.push(((data[i] - totX)) / 200, ((data[i + 1] - totY)) / 200);
        i += 4;
    }
    // Add some points to the position buffer
    const positions = new Float32Array(newdata);
    gl.bindBuffer(gl.ARRAY_BUFFER, a_PositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    // Add some points to the color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, a_ColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_COPY);
    
    // Draw the point
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, positions.length / 4);
}

function dotsProgramGPU(gl) {
    // Compile the vertex shader
    const vertexShaderSource = `#version 300 es
    uniform float u_PointSize;
    in vec2 a_Position;
    in vec4 a_Color;
    out vec4 v_Color;
    void main() {
        v_Color = a_Color;
        gl_Position = vec4(a_Position, 0, 1);
        gl_PointSize = u_PointSize;
    }`
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vertexShaderSource)
    gl.compileShader(vs)

    // Compile the fragment shader
    const fragmentShaderSource = `#version 300 es
    precision highp float;
    in vec4 v_Color;
    out vec4 color;
    void main() {
        color = v_Color;
    }`
    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fragmentShaderSource)
    gl.compileShader(fs)
    
    // Link the program
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('prog info-log:', gl.getProgramInfoLog(prog))
        console.error('vert info-log: ', gl.getShaderInfoLog(vs))
        console.error('frag info-log: ', gl.getShaderInfoLog(fs))
    }
    
    // Use the program
    gl.useProgram(prog)
    
    // Get uniform location
    const u_PointSize = gl.getUniformLocation(prog, 'u_PointSize')
    
    // Set uniform value
    gl.uniform1f(u_PointSize, 2)
    
    // Get attribute locations
    const a_PositionIndex = gl.getAttribLocation(prog, 'a_Position')
    const a_ColorIndex = gl.getAttribLocation(prog, 'a_Color')
    
    // Set up attribute buffers
    const a_PositionBuffer = gl.createBuffer()
    const a_ColorBuffer = gl.createBuffer()
    
    // Set up a vertex array object
    // This tells WebGL how to iterate your attribute buffers
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    
    // Pull 2 floats at a time out of the position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, a_PositionBuffer)
    gl.enableVertexAttribArray(a_PositionIndex)
    gl.vertexAttribPointer(a_PositionIndex, 2, gl.FLOAT, false, 0, 0)
    
    // Pull 4 floats at a time out of the color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, a_ColorBuffer)
    gl.enableVertexAttribArray(a_ColorIndex)
    gl.vertexAttribPointer(a_ColorIndex, 2, gl.FLOAT, false, 0, 0)
    
    // Add some points to the position buffer
    const positions = new Float32Array([
        -1.0,  1.0, // top-left
        1.0,  1.0, // top-right
        1.0, -1.0, // bottom-right
        -1.0, -1.0, // bottom-left
    ])
    gl.bindBuffer(gl.ARRAY_BUFFER, a_PositionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
    
    // Add some points to the color buffer
    const colors = new Float32Array([
        1.0, 0.0, 0.0, 1.0, // red
        0.0, 1.0, 0.0, 1.0, // green
        0.0, 0.0, 1.0, 1.0, // blue
        1.0, 1.0, 0.0, 1.0, // yellow
    ])
    gl.bindBuffer(gl.ARRAY_BUFFER, a_ColorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
    
    // Draw the point
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.POINTS, 0, positions.length / 2) // draw all 4 points
    return prog;
}
function drawDots(data, ctx) {
    let i=0;

    while(i<data.length) {
        i+=4;
        point(data[i], data[i+1], ctx, "#fa44ee");
    }
}
function point(x, y, ctx, color){
    ctx.beginPath();
    ctx.fillStyle = "#fa44ee";
    ctx.arc(Number(x), Number(y), 1, 0, TAU, true);
    ctx.fill();
}
function createShader(gl, type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    console.log(gl.getProgramInfoLog(program));
    
    return program;
}
  