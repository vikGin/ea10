(function () {
    'use strict';

    // Get the WebGL context.
    var canvas = document.getElementById('canvas');
    var gl = canvas.getContext('experimental-webgl');

    // Pipeline setup.
    gl.clearColor(.05, .15, .45, 1);
    // Backface culling.
    gl.frontFace(gl.CCW);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    // Depth(Z)-Buffer.
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);


    // Compile vertex shader. 
    var vsSource = '' +
        'attribute vec3 pos;' +
        'attribute vec4 col;' +
        'varying vec4 color;' +
        'void main(){' + 'color = col;' +
        'gl_Position = vec4(pos, 1);' +
        '}';
    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    // Compile fragment shader.
    var fsSouce = 'precision mediump float;' +
        'varying vec4 color;' +
        'void main() {' +
        'gl_FragColor = color;' +
        '}';
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSouce);
    gl.compileShader(fs);

    // Link shader together into a program.
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "pos");
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Vertex data.
    // Positions, Index data.
    var vertices, indicesLines, indicesTris;
    // Fill the data arrays.
    createVertexData();

    // Setup position vertex buffer object.
    var vboPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
    gl.bufferData(gl.ARRAY_BUFFER,
        vertices, gl.STATIC_DRAW);
    // Bind vertex buffer to attribute variable.
    var posAttrib = gl.getAttribLocation(prog, 'pos');
    gl.vertexAttribPointer(posAttrib, 3, gl.FLOAT,
        false, 0, 0);
    gl.enableVertexAttribArray(posAttrib);

    // Setup constant color.
    var colAttrib = gl.getAttribLocation(prog, 'col');

    // Setup lines index buffer object.
    var iboLines = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboLines);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        indicesLines, gl.STATIC_DRAW);
    iboLines.numberOfElements = indicesLines.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // Setup tris index buffer object.
    var iboTris = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboTris);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        indicesTris, gl.STATIC_DRAW);
    iboTris.numberOfElements = indicesTris.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);


    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Setup rendering tris.
    gl.vertexAttrib4f(colAttrib, 0, 1, 0, 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboTris);
    gl.drawElements(gl.TRIANGLES,
        iboTris.numberOfElements, gl.UNSIGNED_SHORT, 0);

    // Setup rendering lines.
    gl.vertexAttrib4f(colAttrib, 0, 0.4, 0, 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboLines);
    gl.drawElements(gl.LINES,
        iboLines.numberOfElements, gl.UNSIGNED_SHORT, 0);

    // Baumspitze - Tannenbaum mit 3 Kegeln
    function createVertexData() {
        var n = 36;
        var m = 32;
        // Positions.
        vertices = new Float32Array(3 * (n + 1) * (m + 1) * 3);
        // Index data.
        indicesLines = new Uint16Array(2 * 2 * n * m * 3);
        indicesTris = new Uint16Array(3 * 2 * n * m * 3);

        var dt = 2 * Math.PI / n;
        var dr = 1 / m;
        // Counter for entries in index array.
        var iLines = 0;
        var iTris = 0;
        var vertexOffset = 0;

        // Create 3 cones with Y offset
        var yOffsets = [0.43, -0.17, -0.8];
        var scales = [0.31, 0.62, 0.95];

        for (var cone = 0; cone < 3; cone++) {
            var yOffset = yOffsets[cone];
            var scale = scales[cone];

            // Loop angle t.
            for (var i = 0, t = 0; i <= n; i++, t += dt) {
                // Loop radius r.
                for (var j = 0, r = 0; j <= m; j++, r += dr) {

                    var iVertex = vertexOffset + i * (m + 1) + j;

                    var x = 0.8 * r * scale * Math.cos(t);
                    var z = 0.8 * r * scale * Math.sin(t);
                    var y = 1.3 * scale * (1 - r) + yOffset;

                    // Set vertex positions.
                    vertices[iVertex * 3] = x;
                    vertices[iVertex * 3 + 1] = y;
                    vertices[iVertex * 3 + 2] = z;

                    // Set index.
                    // Line on beam.
                    if (j > 0 && i > 0) {
                        indicesLines[iLines++] = iVertex - 1;
                        indicesLines[iLines++] = iVertex;
                    }
                    // Line on ring.
                    if (j > 0 && i > 0) {
                        indicesLines[iLines++] = iVertex - (m + 1.5);
                        indicesLines[iLines++] = iVertex;
                    }

                    // Set index.
                    // Two Triangles.
                    if (j > 0 && i > 0) {
                        indicesTris[iTris++] = iVertex;
                        indicesTris[iTris++] = iVertex - 1;
                        indicesTris[iTris++] = iVertex - (m + 1);

                        //indicesTris[iTris++] = iVertex - 1;
                        //indicesTris[iTris++] = iVertex - (m + 1) - 1;
                        //indicesTris[iTris++] = iVertex - (m + 1);
                    }
                }
            }
            vertexOffset += (n + 1) * (m + 1);
        }
    }

    // Draw Helix.
    //
    gl.lineWidth(10.0);

    // Vertex data.
    // Positions, index data.
    var indices;
    // Fill the data arrays.
    createVertexDataHelix();

    // Setup position vertex buffer object.
    var vboPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
    gl.bufferData(gl.ARRAY_BUFFER,
        vertices, gl.STATIC_DRAW);
    // Bind vertex buffer to attribute variable.
    var posAttrib = gl.getAttribLocation(prog, 'pos');
    gl.vertexAttribPointer(posAttrib, 3,
        gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posAttrib);

    // Setup constant color.
    var colAttrib = gl.getAttribLocation(prog, 'col');
    gl.vertexAttrib4f(colAttrib, 1, 1, 0, 1);

    // Setup index buffer object.
    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        indices, gl.STATIC_DRAW);
    ibo.numberOfElements = indices.length;

    // Clear framebuffer and render primitives.
    //gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES,
        ibo.numberOfElements, gl.UNSIGNED_SHORT, 0);

    // Draw Bowtie Surface
    //
    var indicesBowtie;
    createVertexDataBowtie();

    // Setup position vertex buffer object.
    var vboPosBo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vboPosBo);
    gl.bufferData(gl.ARRAY_BUFFER,
        vertices, gl.STATIC_DRAW);
    // Bind vertex buffer to attribute variable.
    gl.vertexAttribPointer(posAttrib, 3,
        gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posAttrib);

    // Setup constant color.
    gl.vertexAttrib4f(colAttrib, 1, 0, 0, 1);

    // Setup index buffer object.
    var iboBowtie = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboBowtie);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        indicesBowtie, gl.STATIC_DRAW);
    iboBowtie.numberOfElements = indicesBowtie.length;

    // Render bowtie.
    gl.drawElements(gl.TRIANGLES,
        iboBowtie.numberOfElements, gl.UNSIGNED_SHORT, 0);

    function createVertexDataHelix() {
        var m = 32;
        var n = m * 5;
        var tubeSegments = 8;
        var tubeRadius = 0.01;

        // Positions.
        vertices = new Float32Array(3 * (n + 1) * tubeSegments);
        // Index data for triangles.
        indices = new Uint16Array(6 * n * tubeSegments);

        var tn = 3 * 2 * Math.PI;
        var dt = 2 * Math.PI / m;
        var t = 0;
        var iIndices = 0;

        // Create helix centerline positions
        var helixPath = [];
        for (var i = 0; i <= n; i++) {
            var angle = i * dt;
            var helixRadiusAtI = 0.9 * (i / n);
            helixPath.push({
                x: helixRadiusAtI * Math.cos(angle),
                z: helixRadiusAtI * Math.sin(angle),
                y: 0.9 - angle / tn
            });
        }

        // Create tube vertices
        for (var i = 0; i <= n; i++) {
            var center = helixPath[i];
            var dTheta = 2 * Math.PI / tubeSegments;

            // Calculate tangent direction for proper orientation
            var next = helixPath[Math.min(i + 1, n)];
            var prev = i > 0 ? helixPath[i - 1] : center;
            var tangent = {
                x: next.x - prev.x,
                y: next.y - prev.y,
                z: next.z - prev.z
            };
            var tangentLen = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y + tangent.z * tangent.z);
            if (tangentLen > 0) {
                tangent.x /= tangentLen;
                tangent.y /= tangentLen;
                tangent.z /= tangentLen;
            }

            // Create circular cross-section
            for (var j = 0; j < tubeSegments; j++) {
                var angle = j * dTheta;
                var vx = Math.cos(angle);
                var vy = Math.sin(angle);

                // Normal vector perpendicular to tangent
                var normal = { x: vx, y: vy, z: 0 };

                // Adjust normal to be perpendicular to tangent
                var dot = normal.x * tangent.x + normal.y * tangent.y + normal.z * tangent.z;
                normal.x -= dot * tangent.x;
                normal.y -= dot * tangent.y;
                normal.z -= dot * tangent.z;

                var normalLen = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
                if (normalLen > 0) {
                    normal.x /= normalLen;
                    normal.y /= normalLen;
                    normal.z /= normalLen;
                }

                var iVertex = i * tubeSegments + j;
                vertices[iVertex * 3] = center.x + tubeRadius * normal.x;
                vertices[iVertex * 3 + 1] = center.y + tubeRadius * normal.y;
                vertices[iVertex * 3 + 2] = center.z + tubeRadius * normal.z;
            }
        }

        // Create indices for tube surface
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < tubeSegments; j++) {
                var j_next = (j + 1) % tubeSegments;

                var v0 = i * tubeSegments + j;
                var v1 = i * tubeSegments + j_next;
                var v2 = (i + 1) * tubeSegments + j;
                var v3 = (i + 1) * tubeSegments + j_next;

                // First triangle
                indices[iIndices++] = v0;
                indices[iIndices++] = v2;
                indices[iIndices++] = v1;

                // Second triangle
                indices[iIndices++] = v1;
                indices[iIndices++] = v2;
                indices[iIndices++] = v3;
            }
        }
    }

    function createVertexDataBowtie() {
        var nuCount = 30;
        var nvCount = 30;

        // Positions and indices
        vertices = new Float32Array(3 * nuCount * nvCount);
        indicesBowtie = new Uint16Array(6 * (nuCount - 1) * (nvCount - 1));

        var iIndices = 0;
        var scaleX = 0.10;  // Wider in X direction
        var scaleY = 0.10;  // Less height variation
        var scaleZ = 0.1;  // Better depth for ties

        // Rotation angle: 30 degrees in XY plane
        var angleRadians = -40 * Math.PI / 180;
        var cosAngle = Math.cos(angleRadians);
        var sinAngle = Math.sin(angleRadians);

        // Generate surface
        for (var iv = 0; iv < nvCount; iv++) {
            var v = -Math.PI + (2 * Math.PI * iv) / (nvCount - 1);

            for (var iu = 0; iu < nuCount; iu++) {
                var u = -Math.PI + (2 * Math.PI * iu) / (nuCount - 1);

                var iVertex = iv * nuCount + iu;

                // Bowtie surface equations - modified for wider, less tilted ties
                var denomX = Math.sqrt(2 + Math.sin(v));
                var denomY = Math.sqrt(2 + Math.cos(v));

                var x = scaleX * (Math.sin(u) / denomX);
                var y = scaleY * (Math.sin(u) / denomY);
                var z = scaleZ * (Math.cos(u) / (1 + Math.sqrt(2)));

                // Rotate around Z-axis by 30 degrees in XY plane
                var xRotated = x * cosAngle - y * sinAngle;
                var yRotated = x * sinAngle + y * cosAngle;

                // Position on top of tree
                var posY = yRotated + 0.82;

                vertices[iVertex * 3] = xRotated;
                vertices[iVertex * 3 + 1] = posY;
                vertices[iVertex * 3 + 2] = z;
            }
        }

        // Generate indices for triangles
        for (var iv = 0; iv < nvCount - 1; iv++) {
            for (var iu = 0; iu < nuCount - 1; iu++) {
                var v0 = iv * nuCount + iu;
                var v1 = iv * nuCount + (iu + 1);
                var v2 = (iv + 1) * nuCount + iu;
                var v3 = (iv + 1) * nuCount + (iu + 1);

                // First triangle
                indicesBowtie[iIndices++] = v0;
                indicesBowtie[iIndices++] = v2;
                indicesBowtie[iIndices++] = v1;

                // Second triangle
                indicesBowtie[iIndices++] = v1;
                indicesBowtie[iIndices++] = v2;
                indicesBowtie[iIndices++] = v3;
            }
        }
    }

})();

