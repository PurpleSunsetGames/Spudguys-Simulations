'use strict';

const canvas = document.getElementById("mainCanvas");

let listofIds = [
    "timeStepSlider",
    "gridSizeSlider",
    "timeStepSliderDisplay",
    "cellSizeSlider",
    "clearButton",
    "pauseButton",
    "randomButton"
];
let GRID_SIZE = 80;
let requireReset = false;
let timeStep = 10;
let paused = false;
[listofIds].map(e => window[e] = document.getElementById(e));

timeStepSlider.addEventListener("input", (e)=>{
    timeStep = timeStepSlider.value;
    timeStepSliderDisplay.innerHTML = "Time step: " + timeStep + "ms";
});
gridSizeSlider.addEventListener("input", (e)=>{
    GRID_SIZE = gridSizeSlider.value;
    gridSizeSliderDisplay.innerHTML = "Grid size: " + GRID_SIZE;
    requireReset = true;
});
cellSizeSlider.addEventListener("input", (e)=>{
    cellSize = cellSizeSlider.value;
    cellSizeSliderDisplay.innerHTML = "Cell size: " + cellSize;
    vertices = new Float32Array([
        //   X,    Y,
        -cellSize, -cellSize, // Triangle 1 (Blue)
         cellSize, -cellSize,
         cellSize,  cellSize,
    
        -cellSize, -cellSize, // Triangle 2 (Red)
         cellSize,  cellSize,
        -cellSize,  cellSize,
    ]);
    device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/0, vertices);
});
clearButton.addEventListener("click", (e)=>{
    cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
    device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);
    device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray);
});
randomButton.addEventListener("click", (e)=>{
    let cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
    for (let i = 0; i < cellStateArray.length; i++) {
        cellStateArray[i] = i % 2;
    }
    device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);
    device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray);
});
pauseButton.addEventListener("click", (e)=>{
    paused = !paused;
    pauseButton.innerHTML = !paused?"Pause":"Unpause";
});
canvas.addEventListener("click",(e)=>{
    toggleCell(e.clientX-canvas.getBoundingClientRect().x, e.clientY-canvas.getBoundingClientRect().y)
});
let mouseDown = false;
canvas.addEventListener("mousedown",(e)=>{
    mouseDown = true;
});
document.addEventListener("mouseup",(e)=>{
    mouseDown = false;
});
canvas.addEventListener("mousemove",(e)=>{
    if (mouseDown){toggleCell(e.clientX-canvas.getBoundingClientRect().x, e.clientY-canvas.getBoundingClientRect().y, true)}  
});

if (!navigator.gpu) {
    alert("WebGPU is not supported on this browser. Try using the latest version of Google Chrome.")
    throw new Error("WebGPU not supported on this browser.");
}

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
    throw new Error("No appropriate GPUAdapter found.");
}

const device = await adapter.requestDevice();
const context = canvas.getContext("webgpu");
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
    device: device,
    format: canvasFormat,
});

let cellSize = .9;
// two sets (triangles) of three vertices
let vertices = new Float32Array([
    //   X,    Y,
    -cellSize, -cellSize, // Triangle 1 (Blue)
     cellSize, -cellSize,
     cellSize,  cellSize,

    -cellSize, -cellSize, // Triangle 2 (Red)
     cellSize,  cellSize,
    -cellSize,  cellSize,
]);
// adding vertices
const vertexBuffer = device.createBuffer({
    label: "Cell vertices",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/0, vertices);
const vertexBufferLayout = {
    arrayStride: 8,
    attributes: [{
        format: "float32x2",
        offset: 0,
        shaderLocation: 0, // Position, see vertex shader
    }],
};
// adding uniforms
let uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
let uniformBuffer = device.createBuffer({
    label: "Grid Uniforms",
    size: uniformArray.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(uniformBuffer, 0, uniformArray);
function resetCellstateAndBuffers() {
    cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
    // Create a storage buffer to hold the cell state.
    cellStateStorage = [
        device.createBuffer({
            label: "Cell State A",
            size: cellStateArray.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        }),
        device.createBuffer({
            label: "Cell State B",
            size: cellStateArray.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        })
    ];
    // Mark every third cell of the first grid as active.
    for (let i = 0; i < cellStateArray.length; ++i) {
        cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
    }
    device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);
    
    // Mark every other cell of the second grid as active.
    for (let i = 0; i < cellStateArray.length; i++) {
        cellStateArray[i] = i % 2;
    }
    device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray);
    stagingBuffer = device.createBuffer({
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });
    console.log(cellStateArray.byteLength);
}
// adding storage buffers
let cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
// Create a storage buffer to hold the cell state.
let cellStateStorage = [
    device.createBuffer({
        label: "Cell State A",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    }),
    device.createBuffer({
        label: "Cell State B",
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    })
];
// Mark every third cell of the first grid as active.
for (let i = 0; i < cellStateArray.length; ++i) {
    cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
}
device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);
  
// Mark every other cell of the second grid as active.
for (let i = 0; i < cellStateArray.length; i++) {
    cellStateArray[i] = i % 2;
}
device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray);

let stagingBuffer = device.createBuffer({
    size: cellStateArray.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
});

//const WGPUShaderSource = await fetch("life.wgsl").then(result=>result.text());
async function toggleCell(posX, posY, alwaysOn) {
    const commandEncoder = device.createCommandEncoder();
    stagingBuffer = device.createBuffer({
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });
    commandEncoder.copyBufferToBuffer(
        cellStateStorage[step%2],
        0, // Source offset
        stagingBuffer,
        0, // Destination offset
        cellStateArray.byteLength
    );
    device.queue.submit([commandEncoder.finish()]);
    await stagingBuffer.mapAsync(
        GPUMapMode.READ,
        0, // Offset
        cellStateArray.byteLength // Length
    );
    console.log(cellStateArray.byteLength);

    const copyArrayBuffer = stagingBuffer.getMappedRange(0, cellStateArray.byteLength);
    const data = new Int32Array(copyArrayBuffer.slice());
    stagingBuffer.unmap();

    posX = Math.floor(GRID_SIZE*posX/canvas.getBoundingClientRect().width);
    posY = Math.floor(GRID_SIZE*(-posY/canvas.getBoundingClientRect().height + 1));
    let i = posX+(posY*GRID_SIZE);

    data[i] = alwaysOn?1:!data[i];
    console.log(i);
    cellStateArray = data;
    device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);
    device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray);
}
const cellShaderModule = device.createShaderModule({
    label: "Cell shader",
    code: `
    struct VertOut {
        @builtin(position) pos: vec4f,
        @location(0) cell: vec2f,
        @location(1) state: f32
    };
    @group(0) @binding(0) var<uniform> grid: vec2f;
    @group(0) @binding(1) var<storage> cellState: array<u32>;
    
    @vertex
    fn vertexMain(@location(0) pos: vec2f,
                  @builtin(instance_index) instance: u32) -> VertOut {
        let i = f32(instance);
        let state = f32(cellState[instance]);
        let cell = vec2f(i % grid.x, floor(i / grid.x));
        var output: VertOut;
        output.pos = vec4f((pos+1) / grid - 1  + 2*cell/grid, 0, 1);
        output.cell = cell;
        output.state = state;
        return output;
    }
    @fragment
    fn fragmentMain(input: VertOut) -> @location(0) vec4f {
        return vec4f(input.state, input.state, input.state, 1);
    }`
});
const WORKGROUP_SIZE = 8;
const simulationShaderModule = device.createShaderModule({
    label: "Game of Life simulation shader",
    code: `
    @group(0) @binding(0) var<uniform> grid: vec2f;
    @group(0) @binding(1) var<storage> cellStateIn: array<u32>;
    @group(0) @binding(2) var<storage, read_write> cellStateOut: array<u32>;

    fn cellIndex(cell: vec2u) -> u32 {
        return (cell.y % u32(grid.y)) * u32(grid.x) +
               (cell.x % u32(grid.x));
    }
    fn cellActive(x: u32, y: u32) -> u32 {
        return cellStateIn[cellIndex(vec2(x, y))];
    }

    @compute
    @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
        let activeNeighbors = cellActive(cell.x+1, cell.y+1) +
                        cellActive(cell.x+1, cell.y) +
                        cellActive(cell.x+1, cell.y-1) +
                        cellActive(cell.x, cell.y-1) +
                        cellActive(cell.x-1, cell.y-1) +
                        cellActive(cell.x-1, cell.y) +
                        cellActive(cell.x-1, cell.y+1) +
                        cellActive(cell.x, cell.y+1);
        let i = cellIndex(cell.xy);

        // Conway's game of life rules:
        switch activeNeighbors {
            case 2: { // Active cells with 2 neighbors stay active.
            cellStateOut[i] = cellStateIn[i];
            }
            case 3: { // Cells with 3 neighbors become or stay active.
            cellStateOut[i] = 1;
            }
            default: { // Cells with < 2 or > 3 neighbors become inactive.
            cellStateOut[i] = 0;
            }
        }
    }`
});

const bindGroupLayout = device.createBindGroupLayout({
    label: "Cell Bind Group Layout",
    entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: {} // Grid uniform buffer
    }, {
        binding: 1,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: { type: "read-only-storage"} // Cell state input buffer
    }, {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage"} // Cell state output buffer
    }]
});
const pipelineLayout = device.createPipelineLayout({
    label: "Cell Pipeline Layout",
    bindGroupLayouts: [ bindGroupLayout ],
});
const cellPipeline = device.createRenderPipeline({
    label: "Cell pipeline",
    layout: pipelineLayout,
    vertex: {
        module: cellShaderModule,
        entryPoint: "vertexMain",
        buffers: [vertexBufferLayout]
    },
    fragment: {
        module: cellShaderModule,
        entryPoint: "fragmentMain",
        targets: [{
            format: canvasFormat
        }]
    }
});
const simulationPipeline = device.createComputePipeline({
    label: "Simulation pipeline",
    layout: pipelineLayout,
    compute: {
        module: simulationShaderModule,
        entryPoint: "computeMain",
    }
});
let bindGroups = [
    device.createBindGroup({
        label: "Cell renderer bind group A",
        layout: bindGroupLayout, 
        entries: [{
            binding: 0,
            resource: { buffer: uniformBuffer }
        }, {
            binding: 1,
            resource: { buffer: cellStateStorage[0] }
        }, {
            binding: 2, 
            resource: { buffer: cellStateStorage[1] }
        }],
    }),
    device.createBindGroup({
        label: "Cell renderer bind group B",
        layout: bindGroupLayout, 
    
        entries: [{
            binding: 0,
            resource: { buffer: uniformBuffer }
        }, {
            binding: 1,
            resource: { buffer: cellStateStorage[1] }
        }, {
            binding: 2, 
            resource: { buffer: cellStateStorage[0] }
        }],
    }),
];
let step = 0;
let elapsedTimeSinceLastUpdate = timeStep;
let startTime = 0;
let endTime = 0;

function updateGrid() {
    startTime = new Date();
    
    const encoder = device.createCommandEncoder();
    cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
    
    if (requireReset){
        cellStateStorage = [
            device.createBuffer({
                label: "Cell State A",
                size: cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            }),
            device.createBuffer({
                label: "Cell State B",
                size: cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            })
        ];
        bindGroups = [
            device.createBindGroup({
                label: "Cell renderer bind group A",
                layout: bindGroupLayout, 
                entries: [{
                    binding: 0,
                    resource: { buffer: uniformBuffer }
                }, {
                    binding: 1,
                    resource: { buffer: cellStateStorage[0] }
                }, {
                    binding: 2, 
                    resource: { buffer: cellStateStorage[1] }
                }],
            }),
            device.createBindGroup({
                label: "Cell renderer bind group B",
                layout: bindGroupLayout, 
            
                entries: [{
                    binding: 0,
                    resource: { buffer: uniformBuffer }
                }, {
                    binding: 1,
                    resource: { buffer: cellStateStorage[1] }
                }, {
                    binding: 2, 
                    resource: { buffer: cellStateStorage[0] }
                }],
            }),
        ];
        console.log("R");
        uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
        device.queue.writeBuffer(uniformBuffer, 0, uniformArray);
        requireReset = false;
    }
    // Start a render pass 
    const pass = encoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: { r: 0, g: .1, b: .1, a: 1.0 },
            storeOp: "store",
        }]
    });
    // Draw the grid.
    pass.setPipeline(cellPipeline);
    pass.setBindGroup(0, bindGroups[step % 2]); 
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE);
  
    // End the render pass and submit the command buffer
    pass.end();
    if (elapsedTimeSinceLastUpdate >= timeStep && !paused) {
        let computePass = encoder.beginComputePass();
        
        computePass.setPipeline(simulationPipeline);
        computePass.setBindGroup(0, bindGroups[step % 2]);
        let workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);
        computePass.dispatchWorkgroups(workgroupCount, workgroupCount);
        computePass.end();
        elapsedTimeSinceLastUpdate = 0;
        step++; // Increment the step count
    }
    device.queue.submit([encoder.finish()]);

    endTime = new Date();
    elapsedTimeSinceLastUpdate += (endTime-startTime)+20;

    requestAnimationFrame(updateGrid);
}

updateGrid();
