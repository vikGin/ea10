var torus = (function () {

	function createVertexData() {
		var n = 16;
		var m = 24;

		// Positions.
		this.vertices = new Float32Array(3 * (n + 1) * (m + 1));
		var vertices = this.vertices;
		// Normals.
		this.normals = new Float32Array(3 * (n + 1) * (m + 1));
		var normals = this.normals;
		// Texture coordinates (2D).
		this.textureCoord = new Float32Array(2 * (n + 1) * (m + 1));
		var textureCoord = this.textureCoord;
		// Index data.
		this.indicesLines = new Uint16Array(2 * 2 * n * m);
		var indicesLines = this.indicesLines;
		this.indicesTris = new Uint16Array(3 * 2 * n * m);
		var indicesTris = this.indicesTris;

		var du = 2 * Math.PI / n;
		var dv = 2 * Math.PI / m;
		var r = 0.3;
		var R = 0.5;
		// Counter for entries in index array.
		var iLines = 0;
		var iTris = 0;

		// Loop angle u.
		for (var i = 0, u = 0; i <= n; i++, u += du) {
			// Loop angle v.
			for (var j = 0, v = 0; j <= m; j++, v += dv) {

				var iVertex = i * (m + 1) + j;

				var x = (R + r * Math.cos(u)) * Math.cos(v);
				var y = (R + r * Math.cos(u)) * Math.sin(v);
				var z = r * Math.sin(u);

				// Set vertex positions.
				vertices[iVertex * 3] = x;
				vertices[iVertex * 3 + 1] = y;
				vertices[iVertex * 3 + 2] = z;

				// Calc and set normals.
				var nx = Math.cos(u) * Math.cos(v);
				var ny = Math.cos(u) * Math.sin(v);
				var nz = Math.sin(u);
				normals[iVertex * 3] = nx;
				normals[iVertex * 3 + 1] = ny;
				normals[iVertex * 3 + 2] = nz;

				// v-direction (ring): repeat
				textureCoord[iVertex * 2] = (v / (2 * Math.PI)) * 8; // s
				// u-direction (cross-section): mirror vertically (0 to 1 and back to 0) with 90° offset
				var t = (u / (2 * Math.PI) + 0.25) % 1; // 90° offset
				textureCoord[iVertex * 2 + 1] = t < 0.5 ? t * 2 : (1 - t) * 2; // t mit Spiegelung

				// Set index.
				// Line on beam.
				if (j > 0 && i > 0) {
					indicesLines[iLines++] = iVertex - 1;
					indicesLines[iLines++] = iVertex;
				}
				// Line on ring.
				if (j > 0 && i > 0) {
					indicesLines[iLines++] = iVertex - (m + 1);
					indicesLines[iLines++] = iVertex;
				}

				// Set index.
				// Two Triangles.
				if (j > 0 && i > 0) {
					indicesTris[iTris++] = iVertex;
					indicesTris[iTris++] = iVertex - 1;
					indicesTris[iTris++] = iVertex - (m + 1);
					//
					indicesTris[iTris++] = iVertex - 1;
					indicesTris[iTris++] = iVertex - (m + 1) - 1;
					indicesTris[iTris++] = iVertex - (m + 1);
				}
			}
		}
	}

	return {
		createVertexData: createVertexData
	}

}());
