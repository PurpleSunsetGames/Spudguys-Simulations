'use strict';

let listofIds = [
    "canvas", 
    "canvas2", 
    "nonGLCanvas",
    "framerateDisplay", 
    "sizeSlider",
    "sizeSliderDisplay",
    "GSlider",
    "GSliderDisplay",
    "dampFactorSlider",
    "dampFactorSliderDisplay",
    "timeStepSlider",
    "timeStepDisplay"
];

[listofIds].map(e => window[e] = document.getElementById(e));

let vertexShaderSource = "";
let fragmentShaderSource = "";
let displayRes = 2,
    windowOffset = {x:0, y:0, z:1},
    defaultWindowOffset = {x:0, y:0, z:1},
    confine = 0,
    G = GSlider.value,
    mouseDown,
    animating=1,
    framerate,
    cease = false,
    pointSize = sizeSlider.value / 5,
    dampFactor = dampFactorSlider.value,
    springStrength = .5,
    timeStep = 1;
let listOfObjects = [
]
 
let blockWidth=80, blockHeight=65;
 
GSliderDisplay.innerHTML = "G: " + Math.round(100*G)/100;
sizeSliderDisplay.innerHTML = "Particle Size: " + Math.ceil(pointSize);
let currTouchDist = 0;
let currTouchPos;
let prevTouchPos;
let touchNum = 0;

sizeSlider.addEventListener("input", (e)=>{
    pointSize = sizeSlider.value / 5;
    sizeSliderDisplay.innerHTML = "Particle Size: " + Math.ceil(pointSize);
});
timeStepSlider.addEventListener("input", (e)=>{
    timeStep = timeStepSlider.value;
    timeStepDisplay.innerHTML = "Time Step: " + timeStep;
});
GSlider.addEventListener("input", (e)=>{
    G = GSlider.value;
    GSliderDisplay.innerHTML = "G: " + Math.round(10000*G)/10000;
});
dampFactorSlider.addEventListener("input", (e)=>{
    dampFactor = dampFactorSlider.value;
    dampFactorSliderDisplay.innerHTML = "Damping: " + Math.round(100*dampFactor)/100;
});
springStrengthSlider.addEventListener("input", (e)=>{
    springStrength = springStrengthSlider.value;
    springStrengthSliderDisplay.innerHTML = "Spring Force: " + Math.round(10*springStrength)/10;
});

canvas2.addEventListener("touchend", (e)=>{
    prevTouchPos = [0,0];
    currTouchPos = [0,0];
    currTouchDist = 0;
    touchNum=0;
})

canvas2.addEventListener("touchmove", (e)=>{
    if (e.targetTouches.length === 2 && touchNum === 2) {
        let diff = [(e.targetTouches[0].clientX - e.targetTouches[1].clientX), (e.targetTouches[0].clientY - e.targetTouches[1].clientY)];
        let thisTouchDist = Math.sqrt((e.targetTouches[0].clientX - e.targetTouches[1].clientX)**2 + (e.targetTouches[0].clientY - e.targetTouches[1].clientY)**2);
        windowOffset.z -= (thisTouchDist - currTouchDist)*windowOffset.z / 200;
        currTouchDist = thisTouchDist;
        currTouchPos = [e.targetTouches[1].clientX + diff[0]/2, e.targetTouches[1].clientY + diff[1]/2];

        windowOffset.x += 2*windowOffset.z * (currTouchPos[0] - prevTouchPos[0]) / window.innerWidth;
        windowOffset.y -= 2*windowOffset.z * (currTouchPos[1] - prevTouchPos[1]) / window.innerWidth;

        prevTouchPos = currTouchPos;
    }
    else if (e.targetTouches.length === 1 && touchNum === 1) {
        currTouchPos = [e.targetTouches[0].clientX, e.targetTouches[0].clientY];

        windowOffset.x += 2*windowOffset.z * (currTouchPos[0] - prevTouchPos[0]) / window.innerWidth;
        windowOffset.y -= 2*windowOffset.z * (currTouchPos[1] - prevTouchPos[1]) / window.innerWidth;
        prevTouchPos = currTouchPos;
    }
})
canvas2.addEventListener("touchstart", (e)=>{
    if (e.targetTouches.length === 2) {
        touchNum = 2;
        let diff = [(e.targetTouches[0].clientX - e.targetTouches[1].clientX), (e.targetTouches[0].clientY - e.targetTouches[1].clientY)];
        prevTouchPos = [e.targetTouches[1].clientX + diff[0]/2, e.targetTouches[1].clientY + diff[1]/2];
        currTouchPos = prevTouchPos;
        let thisTouchDist = Math.sqrt((e.targetTouches[0].clientX - e.targetTouches[1].clientX)**2 + (e.targetTouches[0].clientY - e.targetTouches[1].clientY)**2);
        currTouchDist = thisTouchDist;
    }
    else if (e.targetTouches.length === 1) {
        touchNum = 1;
        prevTouchPos = [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
        currTouchPos = prevTouchPos;
    }
})

let splitWidth = blockWidth;
let splitHeight = blockHeight;
console.log(splitWidth, splitHeight);

// Adding interaction for the uniforms
canvas2.addEventListener("wheel", (e)=>{
    windowOffset.z += e.deltaY*windowOffset.z / 1000;
});
canvas2.addEventListener('mousedown', 
() => {mouseDown = true}
);
canvas2.addEventListener("mousemove", (e)=>{
    if (mouseDown) {
        windowOffset.x += 2*e.movementX/canvas2.clientWidth * windowOffset.z;
        windowOffset.y -= 2*e.movementY/canvas2.clientHeight * windowOffset.z;
    }
})
window.addEventListener("keydown", (e)=>{
    if (e.key === " ") {
        animating = !animating;
    }
});
window.addEventListener('mouseup', 
() => {mouseDown = false}
);
homeIcon.addEventListener("click",function(){
    windowOffset.x = defaultWindowOffset.x;
    windowOffset.y = defaultWindowOffset.y;
    windowOffset.z = defaultWindowOffset.z;
});

async function getFragShad() {
    fragmentShaderSource = await fetch("fragmentShader.glsl").then(result=>result.text());
    vertexShaderSource = await fetch("vertexShader.glsl").then(result=>result.text());
    mainGl(canvas);
}
getFragShad();
let conns = [];
let connsTarLengs = [];
let conns2 = [];
let conns2TarLengs = [];

function mainGl(canvas) {
    let gl = canvas.getContext("webgl2");
    canvas.style.display = 'none';

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
    gl.viewport(0,0,splitWidth,splitHeight);
    gl.clearColor(0, 0, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    let primitiveType = gl.TRIANGLES;
    let count = 6;


    // everything in the below area is for setting up the input and output texture arrays
    /// ------------------------------- ///

    let inputTexture = gl.createTexture();
    let connsTexture = gl.createTexture();
    let connsTarLengsTexture = gl.createTexture();
    let conns2Texture = gl.createTexture();
    let conns2TarLengsTexture = gl.createTexture();

    let inputTextureUniformLocation = gl.getUniformLocation(program, "u_texture");
    let connsTextureUniformLocation = gl.getUniformLocation(program, "u_conns");
    let connsTarLengsTextureUniformLocation = gl.getUniformLocation(program, "u_conns_tar_lengs");
    let conns2TextureUniformLocation = gl.getUniformLocation(program, "u_conns2");
    let conns2TarLengsTextureUniformLocation = gl.getUniformLocation(program, "u_conns2_tar_lengs");


    let data = [];
    let colors = [];
    function bindTexture(texture, data){}
    function regenParticleData(r=false){
        splitWidth = blockWidth; 
        splitHeight = blockHeight;
        gl.bindTexture(gl.TEXTURE_2D, inputTexture);
        data = [];
        colors = [];
        for (let i=0; i<splitHeight; i++) {
            for (let i2=0; i2<splitWidth; i2++) {
                data.push((i2-splitWidth/2)*9, (i)*9 + 49, 0, 0);
                colors.push(i2/splitWidth,.2,i/splitHeight, 1);
            }
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,
            splitWidth, splitHeight, 0,
            gl.RGBA, gl.FLOAT, new Float32Array(data));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindTexture(gl.TEXTURE_2D, connsTexture);
        conns = [];
        let len = splitHeight*splitWidth - 1;
        for (let i=0; i<splitHeight*splitWidth; i++) {
            conns.push((((i+1)>len)||(((i+1)%splitWidth) === 0))?-1:(i+1), 
                       ((i-1)<0||(((i-1)%splitWidth)===(splitWidth-1)))?-1:i-1, 
                       (i+splitWidth)>len?-1:i+splitWidth, 
                       (i-splitWidth)<0?-1:i-splitWidth);
            connsTarLengs.push(10, 10, 10, 10);
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,
            splitWidth, splitHeight, 0,
            gl.RGBA, gl.FLOAT, new Float32Array(conns));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, connsTarLengsTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,
            splitWidth, splitHeight, 0,
            gl.RGBA, gl.FLOAT, new Float32Array(connsTarLengs));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


        gl.bindTexture(gl.TEXTURE_2D, conns2Texture);
        conns2 = [];
        let tenroot2 = 10*Math.sqrt(2);
        for (let i=0; i<splitHeight*splitWidth; i++) {
            conns2.push((((i+1+splitWidth)>len)||(((i+1+splitWidth)%splitWidth) === 0))?-1:(i+1+splitWidth), 
                        ((i-1-splitWidth)<0||(((i-1-splitWidth)%splitWidth) === (splitWidth-1)))?-1:i-1-splitWidth, 
                        (((i+1-splitWidth)<0)||(((i+1-splitWidth)%splitWidth) === 0))?-1:(i+1-splitWidth), 
                        ((i-1+splitWidth)>len||(((i-1+splitWidth)%splitWidth) === (splitWidth-1)))?-1:i-1+splitWidth);
            conns2TarLengs.push(tenroot2,tenroot2,tenroot2,tenroot2);
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,
            splitWidth, splitHeight, 0,
            gl.RGBA, gl.FLOAT, new Float32Array(conns2));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, conns2TarLengsTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,
            splitWidth, splitHeight, 0,
            gl.RGBA, gl.FLOAT, new Float32Array(conns2TarLengs));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        if(r){return data}
    }
    function clearParticleData(){
        gl.bindTexture(gl.TEXTURE_2D, inputTexture);

        data = [];
        colors = [];
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,
            0, 0, 0,
            gl.RGBA, gl.FLOAT, new Float32Array(data));
        splitWidth = 0;
        splitHeight= 0;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    regenParticleData();
    
    resetButton.addEventListener("click", regenParticleData);
    clearButton.addEventListener("click", clearParticleData);

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
                    splitWidth, splitHeight, border,
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
    // Bind the inputTexture to texture unit 3, which has been associated with uniform input "u_texture" using uniform1i(location of u_texture, 5)
    // it is also associated with gl.TEXTURE_2D, which is why we are able to update it later
    let inde = 1;
    gl.activeTexture(gl.TEXTURE0+inde+1);
    gl.bindTexture(gl.TEXTURE_2D, connsTexture);
    gl.uniform1i(connsTextureUniformLocation, inde+1);
    gl.activeTexture(gl.TEXTURE0+inde+2);
    gl.bindTexture(gl.TEXTURE_2D, connsTarLengsTexture);
    gl.uniform1i(connsTarLengsTextureUniformLocation, inde+2);

    gl.activeTexture(gl.TEXTURE0+inde+3);
    gl.bindTexture(gl.TEXTURE_2D, conns2Texture);
    gl.uniform1i(conns2TextureUniformLocation, inde+3);
    gl.activeTexture(gl.TEXTURE0+inde+4);
    gl.bindTexture(gl.TEXTURE_2D, conns2TarLengsTexture);
    gl.uniform1i(conns2TarLengsTextureUniformLocation, inde+4);
    
    gl.activeTexture(gl.TEXTURE0+inde);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.uniform1i(inputTextureUniformLocation, inde);

    
    
    function resetTarget(){
        gl.bindTexture(gl.TEXTURE_2D, inputTexture);
        let inputTextureUniformLocation = gl.getUniformLocation(program, "u_texture");

        gl.bindTexture(gl.TEXTURE_2D, targetTexture);

        const level = 0;
        const internalFormat = gl.RGBA32F;
        const border = 0;
        const format = gl.RGBA;
        const typel = gl.FLOAT;
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                        splitWidth, splitHeight, border,
                        format, typel, new Float32Array(splitWidth*splitHeight*4));
        
        // set the filtering so we don't need mips
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        const attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, level);    
        
        gl.activeTexture(gl.TEXTURE0+inde);
        gl.bindTexture(gl.TEXTURE_2D, inputTexture);
        gl.uniform1i(inputTextureUniformLocation, inde);
    }

    /// ------------------------------- ///

    // Everything should be bound properly now. Time to start actually rendering stuff to the texture
    let outData = new Float32Array(data);

    let ctx = canvas2.getContext("webgl2");
    let dotsProgram = dotsProgramGPU(ctx);

    // some uniforms for the main program
    let confinementAreaLocation = gl.getUniformLocation(program, "confinementArea");
    let randomSeedLocation = gl.getUniformLocation(program, "randSeed");
    let confineLocation = gl.getUniformLocation(program, "confine");
    let GLocation = gl.getUniformLocation(program, "G");
    let dampFactorLocation = gl.getUniformLocation(program, "dampFactor");
    let springStrengthLocation = gl.getUniformLocation(program, "springStrength")
    let timeStepLocation = gl.getUniformLocation(program, "timeStep");
    
    gl.uniform1i(confineLocation, confine);
    gl.uniform1f(GLocation, G);
    gl.uniform1f(dampFactorLocation, dampFactor);
    gl.uniform1f(springStrengthLocation, springStrength);
    gl.uniform1f(timeStepLocation, timeStep);

    // uniforms and parameters for the dotsProgram
    let averagePosCenter = 0;
    let lastTime;
    let thisTime;
    let needRegenBuffer = false;
    //let cyx = canvas2.getContext("2d");

    canvas2.addEventListener("click", (e)=>{
        if (e.shiftKey) {
            let rect = e.target.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY + rect.top;
            x = (x/window.innerWidth) * rect.width;
            y = (y/window.innerHeight) * rect.height;
            // [((x-rect.width/2)*windowOffset.z*2)-windowOffset.x*rect.width, (-(y-rect.height/2))*windowOffset.z*2 - windowOffset.y*rect.height, 0, 0]
        }
    });
    drawLoop();    
    function drawLoop() {
        thisTime = performance.now();

        framerateDisplay.innerHTML = "Framerate (fps): " + Math.round(1000 / (thisTime - lastTime));
        // render to target texture by binding the frame buffer
        if (animating) {
            gl.activeTexture(gl.TEXTURE0+inde);
            gl.bindTexture(gl.TEXTURE_2D, inputTexture);
            outData.forEach(element => {
                if(element.isNaN || element===Infinity) {
                    animating = false;
                    console.log(outData);
                }
            });
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            // Set the uniform parameters and run the program
            gl.uniform4f(confinementAreaLocation, 0, canvas2.width, 0, canvas2.height);
            gl.uniform2f(randomSeedLocation, Math.random(), Math.random());
            gl.uniform1f(GLocation, G);
            gl.uniform1f(dampFactorLocation, dampFactor);
            gl.uniform1f(springStrengthLocation, springStrength);
            gl.uniform1f(timeStepLocation, timeStep);

            gl.viewport(0, 0, splitWidth, splitHeight);

            gl.drawArrays(primitiveType, offset, count);
            gl.readPixels(0, 0, splitWidth, splitHeight, format, typel, outData);

            // finally, retrieve data from the fb and send it to outData as a js array
            needRegenBuffer = false;
            if(outData.length/4 != splitHeight*splitWidth){
                outData = Array.from(outData);
                needRegenBuffer = true
            }
            if(needRegenBuffer){
                resetTarget();
                outData = new Float32Array(outData);
            }
            // use that js array to update the data of the input texture(s)
            gl.bindTexture(gl.TEXTURE_2D, connsTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat,
                          splitWidth, splitHeight, 0,
                          format, typel, new Float32Array(conns));
            gl.uniform1i(connsTextureUniformLocation, inde+1);
            gl.bindTexture(gl.TEXTURE_2D, connsTarLengsTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat,
                          splitWidth, splitHeight, 0,
                          format, typel, new Float32Array(connsTarLengs));
            gl.uniform1i(connsTarLengsTextureUniformLocation, inde+2);

            gl.bindTexture(gl.TEXTURE_2D, conns2Texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat,
                          splitWidth, splitHeight, 0,
                          format, typel, new Float32Array(conns2));
            gl.uniform1i(conns2TextureUniformLocation, inde+3);
            gl.bindTexture(gl.TEXTURE_2D, conns2TarLengsTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat,
                          splitWidth, splitHeight, 0,
                          format, typel, new Float32Array(conns2TarLengs));
            gl.uniform1i(conns2TarLengsTextureUniformLocation, inde+4);

            gl.bindTexture(gl.TEXTURE_2D, inputTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat,
                          splitWidth, splitHeight, 0,
                          format, typel, outData);
            gl.uniform1i(inputTextureUniformLocation, inde);
        }
        // draw dots on canvas based on that data
        drawDotsGPU(outData, ctx, dotsProgram, colors, averagePosCenter);
        //drawLinesGPU(outData, ctx, dotsProgram, colors, averagePosCenter);
        lastTime = thisTime;
        //cyx.beginPath();
        //cyx.moveTo(0,100);
        //cyx.lineTo(1000,100);
        if (!cease) {
            requestAnimationFrame(drawLoop);
        }
    }
}
function greatestFactors(x) {
    let a=1;
    let found1=1;
    let found2=x;
    while (a<Math.sqrt(x)){
        if (Number.isInteger(x/a)){
            found1=a;
            found2=x/a;
        }
        a++;
    }
    return {x:Number(found1), y:Number(found2)};
}

const TAU = 2*Math.PI;

function drawLinesGPU(data,gl,prog,colors, averagePosCenter) {
    const a_PositionIndex = gl.getAttribLocation(prog, 'a_Position');
    const a_ColorIndex = gl.getAttribLocation(prog, 'a_Color');
    let windowOffsetLocation = gl.getUniformLocation(prog, "windowOffset");
    const u_PointSize = gl.getUniformLocation(prog, 'u_PointSize');

    
    // Set up attribute buffers
    const a_PositionBuffer = gl.createBuffer();
    const a_ColorBuffer = gl.createBuffer();
    
    // Set up a vertex array object
    // This tells WebGL how to iterate your attribute buffers
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    
    // Pull 2 floats at a time out of the position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, a_PositionBuffer);
    gl.enableVertexAttribArray(a_PositionIndex);
    gl.vertexAttribPointer(a_PositionIndex, 2, gl.FLOAT, false, 0, 0);
    
    // Pull 4 floats at a time out of the color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, a_ColorBuffer);
    gl.enableVertexAttribArray(a_ColorIndex);
    gl.vertexAttribPointer(a_ColorIndex, 4, gl.FLOAT, false, 0, 0);
    let newdata = [];
    let i = 0;
    while (i<conns.length) {
        // world to canvas coords go brr
        // i/4 = p1 of conn
        // data[conns[i]] = p2 of conn
        newdata.push(((data[conns[i]==-1?(i/4):conns[i]])) / canvas2.width,
                     ((data[conns[i]==-1?(i/4):conns[i]])) / canvas2.height);
        newdata.push(((data[i/4])) / canvas2.width, ((data[i/4])) / canvas2.height);
        newdata.push(((data[conns[i+1]==-1?(i/4):conns[i+1]])) / canvas2.width,
                     ((data[conns[i+1]==-1?(i/4):conns[i+1]])) / canvas2.height);
        newdata.push(((data[i/4])) / canvas2.width, ((data[i/4])) / canvas2.height);
        newdata.push(((data[conns[i+2]==-1?(i/4):conns[i+2]])) / canvas2.width,
                     ((data[conns[i+2]==-1?(i/4):conns[i+2]])) / canvas2.height);
        newdata.push(((data[i/4])) / canvas2.width, ((data[i/4])) / canvas2.height);
        newdata.push(((data[conns[i+3]==-1?(i/4):conns[i+3]])) / canvas2.width,
                     ((data[conns[i+3]==-1?(i/4):conns[i+3]])) / canvas2.height);
        newdata.push(((data[i/4])) / canvas2.width, ((data[i/4])) / canvas2.height);
        i+=4;
    }
    // Add some points to the position buffer
    const positions = new Float32Array(newdata);
    gl.bindBuffer(gl.ARRAY_BUFFER, a_PositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    // Add some points to the color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, a_ColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_COPY);
    
    // Draw the point
    canvas2.style.width = String(window.innerWidth - 20) + 'px';
    canvas2.style.height = String(window.innerHeight - 20) + 'px';
    
    canvas2.width = window.innerWidth - 20;
    canvas2.height = window.innerHeight - 20;

    gl.uniform3f(windowOffsetLocation, windowOffset.x, windowOffset.y, windowOffset.z);
    gl.uniform1f(u_PointSize, pointSize/windowOffset.z);

    gl.viewport(0, 0, window.innerWidth, window.innerHeight);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, conns.length / 2);
}
function drawDotsGPU(data,gl,prog,colors, averagePosCenter) {
    const a_PositionIndex = gl.getAttribLocation(prog, 'a_Position');
    const a_ColorIndex = gl.getAttribLocation(prog, 'a_Color');
    let windowOffsetLocation = gl.getUniformLocation(prog, "windowOffset");
    const u_PointSize = gl.getUniformLocation(prog, 'u_PointSize');

    
    // Set up attribute buffers
    const a_PositionBuffer = gl.createBuffer();
    const a_ColorBuffer = gl.createBuffer();
    
    // Set up a vertex array object
    // This tells WebGL how to iterate your attribute buffers
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    
    // Pull 2 floats at a time out of the position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, a_PositionBuffer);
    gl.enableVertexAttribArray(a_PositionIndex);
    gl.vertexAttribPointer(a_PositionIndex, 2, gl.FLOAT, false, 0, 0);
    
    // Pull 4 floats at a time out of the color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, a_ColorBuffer);
    gl.enableVertexAttribArray(a_ColorIndex);
    gl.vertexAttribPointer(a_ColorIndex, 4, gl.FLOAT, false, 0, 0);
    let newdata = [];
    colors = [];
    let i = 0;
    while (i<data.length) {
        newdata.push(((data[i])) / canvas2.width, ((data[i + 1])) / canvas2.height);
        colors.push(data[i+2]+.1, .03, data[i+3]+.1, 1);
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
    canvas2.style.width = String(window.innerWidth - 20) + 'px';
    canvas2.style.height = String(window.innerHeight - 20) + 'px';
    
    canvas2.width = window.innerWidth - 20;
    canvas2.height = window.innerHeight - 20;

    gl.uniform3f(windowOffsetLocation, windowOffset.x, windowOffset.y, windowOffset.z);
    gl.uniform1f(u_PointSize, pointSize/windowOffset.z);

    gl.viewport(0, 0, window.innerWidth, window.innerHeight);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, positions.length / 2);
}

function dotsProgramGPU(gl) {
    // Compile the vertex shader
    const vertexShaderSource = `#version 300 es
    uniform float u_PointSize;
    in vec2 a_Position;
    in vec4 a_Color;

    uniform vec3 windowOffset;

    out vec4 v_Color;
    void main() {
        v_Color = a_Color;
        gl_Position = vec4(a_Position + windowOffset.xy, 0., windowOffset.z);
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
        color = vec4(v_Color.xyz, 1.);
    }`
    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fragmentShaderSource)
    gl.compileShader(fs)
    
    // Link the program
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('prog info-log:', gl.getProgramInfoLog(prog))
        console.error('vert info-log: ', gl.getShaderInfoLog(vs))
        console.error('frag info-log: ', gl.getShaderInfoLog(fs))
    }
    
    // Use the program
    gl.useProgram(prog);

    let windowOffsetLocation = gl.getUniformLocation(prog, "windowOffset");
    gl.uniform3f(windowOffsetLocation, windowOffset.x, windowOffset.y, windowOffset.z);

    gl.viewport(0, 0, canvas2.width, canvas2.height);
    
    // Get uniform location
    const u_PointSize = gl.getUniformLocation(prog, 'u_PointSize');
    
    // Set uniform value
    gl.uniform1f(u_PointSize, pointSize);
    
    // Get attribute locations
    const a_PositionIndex = gl.getAttribLocation(prog, 'a_Position');
    const a_ColorIndex = gl.getAttribLocation(prog, 'a_Color');
    
    // Set up attribute buffers
    const a_PositionBuffer = gl.createBuffer();
    const a_ColorBuffer = gl.createBuffer();
    
    // Set up a vertex array object
    // This tells WebGL how to iterate your attribute buffers
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    
    // Pull 2 floats at a time out of the position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, a_PositionBuffer);
    gl.enableVertexAttribArray(a_PositionIndex);
    gl.vertexAttribPointer(a_PositionIndex, 2, gl.FLOAT, false, 0, 0);
    
    // Pull 4 floats at a time out of the color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, a_ColorBuffer);
    gl.enableVertexAttribArray(a_ColorIndex);
    gl.vertexAttribPointer(a_ColorIndex, 4, gl.FLOAT, false, 0, 0);
    
    // Add some points to the position buffer
    const positions = new Float32Array([
        -1.0,  1.0, // top-left
        1.0,  1.0, // top-right
        1.0, -1.0, // bottom-right
        -1.0, -1.0, // bottom-left
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, a_PositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    // Add some points to the color buffer
    const colors = new Float32Array([
        1.0, 0.0, 0.0, .2, // red
        0.0, 1.0, 0.0, .2, // green
        0.0, 0.0, 1.0, .2, // blue
        1.0, 1.0, 0.0, .2, // yellow
    ])
    gl.bindBuffer(gl.ARRAY_BUFFER, a_ColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    
    // Draw the point
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, positions.length / 2); // draw all 4 points
    return prog;
}
function drawObjects(ctx) {

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
  
