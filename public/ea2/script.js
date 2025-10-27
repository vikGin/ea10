(function () {
    'use strict';

    const canvas = document.getElementById('background-canvas');
    const gl = canvas.getContext('webgl2');

    // Compile a vertex shader (WebGL 2.0 ES 3.00 syntax)
    const vsSource = `#version 300 es
in vec2 pos;
void main(){
    gl_Position = vec4(pos, 0.0, 1.0);
}`;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    // Compile a fragment shader (WebGL 2.0 ES 3.00 syntax)
    const fsSource = `#version 300 es
precision mediump float;
out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
}`;
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    // Link together into a program
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Load vertex data into a buffer
    const vertices = new Float32Array([-0.1, 0.1, -0.2, 0.3, 0, 0.3, -0.1, 0.1, 0.1, 0.1, 0, 0.3, 0.3, 0.3, 0.1, 0.1, 0.3, -0.12, 0.3, 0.3, 0.3, -0.12, 0.2, -0.2, 0.1, 0.1, -0.025, -0.3, -0.1, 0.1, -0.1, -0.3, -0.025, -0.3, -0.05, -0.7, -0.1, -0.3, -0.15, -0.7, -0.05, -0.7, -0.15, -0.7, -0.175, -0.3, -0.1, -0.3, -0.175, -0.3, -0.1, 0.1, -0.3, 0.1, -0.175, -0.3, -0.3, 0.1, -0.2, 0.3, -0.5, 0.3, -0.3, 0.1, -0.5, -0.12, -0.5, 0.3, -0.5, -0.12, -0.385, -0.18, -0.3, 0.1]);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Bind vertex buffer to attribute variable
    const posAttrib = gl.getAttribLocation(prog, 'pos');
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posAttrib);

    // Pipeline setup
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 2);
})();
