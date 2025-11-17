var sphere = (function () {

    // Helper function to normalize a vector
    function normalize(p) {
        var length = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        if (length > 1e-10) { // Use smaller epsilon for better precision
            p.x /= length;
            p.y /= length;
            p.z /= length;
        } else {
            // Fallback for degenerate cases
            p.x = 1.0;
            p.y = 0.0;
            p.z = 0.0;
        }
        return p;
    }

    function createVertexData(iterations) {
        // Default value if no parameter is provided
        if (typeof iterations === 'undefined') {
            iterations = 0;
        }

        // Ensure minimum of 0 iteration
        iterations = Math.max(0, iterations);

        // Limit to 6 iterations to prevent WebGL 16-bit index overflow
        // At 7 iterations: 65,536 triangles = 196,608 vertices > 65,535 (16-bit limit)
        if (iterations > 6) {
            console.warn("Iterations limited to 6 to prevent WebGL index overflow. Requested: " + iterations);
            iterations = 6;
        }

        // Calculate maximum number of facets: (4^iterations) * 8
        var maxFacets = Math.pow(4, iterations) * 8;

        // Temporary storage for facets during subdivision
        var facets = [];

        // Initial 6 points of octahedron
        var a = 1 / Math.sqrt(2.0);
        var p = [
            { x: 0, y: 0, z: 1 },
            { x: 0, y: 0, z: -1 },
            { x: -a, y: -a, z: 0 },
            { x: a, y: -a, z: 0 },
            { x: a, y: a, z: 0 },
            { x: -a, y: a, z: 0 }
        ];

        // Create the level 0 octahedron (8 triangular faces)
        facets.push({ p1: p[0], p2: p[3], p3: p[4] });
        facets.push({ p1: p[0], p2: p[4], p3: p[5] });
        facets.push({ p1: p[0], p2: p[5], p3: p[2] });
        facets.push({ p1: p[0], p2: p[2], p3: p[3] });
        facets.push({ p1: p[1], p2: p[4], p3: p[3] });
        facets.push({ p1: p[1], p2: p[5], p3: p[4] });
        facets.push({ p1: p[1], p2: p[2], p3: p[5] });
        facets.push({ p1: p[1], p2: p[3], p3: p[2] });

        // Perform subdivision iterations
        for (var it = 0; it < iterations; it++) {
            var newFacets = [];

            for (var i = 0; i < facets.length; i++) {
                var f = facets[i];

                // Calculate midpoints and project to unit sphere
                var pa = {
                    x: (f.p1.x + f.p2.x) / 2,
                    y: (f.p1.y + f.p2.y) / 2,
                    z: (f.p1.z + f.p2.z) / 2
                };
                var pb = {
                    x: (f.p2.x + f.p3.x) / 2,
                    y: (f.p2.y + f.p3.y) / 2,
                    z: (f.p2.z + f.p3.z) / 2
                };
                var pc = {
                    x: (f.p3.x + f.p1.x) / 2,
                    y: (f.p3.y + f.p1.y) / 2,
                    z: (f.p3.z + f.p1.z) / 2
                };

                // Normalize to project onto unit sphere
                normalize(pa);
                normalize(pb);
                normalize(pc);

                // Create 4 new triangles from 1 original
                newFacets.push({ p1: f.p1, p2: pa, p3: pc });
                newFacets.push({ p1: pa, p2: f.p2, p3: pb });
                newFacets.push({ p1: pb, p2: f.p3, p3: pc });
                newFacets.push({ p1: pa, p2: pb, p3: pc });
            }

            facets = newFacets;
        }

        // Convert facets to vertex arrays
        var numVertices = facets.length * 3;

        console.log("Iterations:", iterations, "Facets:", facets.length, "Vertices:", numVertices);

        // With max 6 iterations, we have at most 16,384 triangles = 49,152 vertices
        // This fits comfortably within the 16-bit index limit of 65,535
        this.vertices = new Float32Array(numVertices * 3);
        this.normals = new Float32Array(numVertices * 3);
        this.indicesLines = new Uint16Array(facets.length * 6);
        this.indicesTris = new Uint16Array(facets.length * 3);

        var vertices = this.vertices;
        var normals = this.normals;
        var indicesLines = this.indicesLines;
        var indicesTris = this.indicesTris;

        var scale = 0.8; // Scale down the sphere

        // Fill vertex and normal arrays
        for (var i = 0; i < facets.length; i++) {
            var f = facets[i];
            var baseIndex = i * 3;

            // Vertex 1
            vertices[baseIndex * 3] = f.p1.x * scale;
            vertices[baseIndex * 3 + 1] = f.p1.y * scale;
            vertices[baseIndex * 3 + 2] = f.p1.z * scale;
            normals[baseIndex * 3] = f.p1.x;
            normals[baseIndex * 3 + 1] = f.p1.y;
            normals[baseIndex * 3 + 2] = f.p1.z;

            // Vertex 2
            vertices[(baseIndex + 1) * 3] = f.p2.x * scale;
            vertices[(baseIndex + 1) * 3 + 1] = f.p2.y * scale;
            vertices[(baseIndex + 1) * 3 + 2] = f.p2.z * scale;
            normals[(baseIndex + 1) * 3] = f.p2.x;
            normals[(baseIndex + 1) * 3 + 1] = f.p2.y;
            normals[(baseIndex + 1) * 3 + 2] = f.p2.z;

            // Vertex 3
            vertices[(baseIndex + 2) * 3] = f.p3.x * scale;
            vertices[(baseIndex + 2) * 3 + 1] = f.p3.y * scale;
            vertices[(baseIndex + 2) * 3 + 2] = f.p3.z * scale;
            normals[(baseIndex + 2) * 3] = f.p3.x;
            normals[(baseIndex + 2) * 3 + 1] = f.p3.y;
            normals[(baseIndex + 2) * 3 + 2] = f.p3.z;

            // Triangle indices
            indicesTris[i * 3] = baseIndex;
            indicesTris[i * 3 + 1] = baseIndex + 1;
            indicesTris[i * 3 + 2] = baseIndex + 2;

            // Line indices (wireframe)
            indicesLines[i * 6] = baseIndex;
            indicesLines[i * 6 + 1] = baseIndex + 1;
            indicesLines[i * 6 + 2] = baseIndex + 1;
            indicesLines[i * 6 + 3] = baseIndex + 2;
            indicesLines[i * 6 + 4] = baseIndex + 2;
            indicesLines[i * 6 + 5] = baseIndex;
        }
    }

    return {
        createVertexData: createVertexData
    }

}());