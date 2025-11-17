var torus = (function () {

	function createVertexData() {
		var n = 24;
		var m = 32;

		// Positions.
		this.vertices = new Float32Array(3 * (n + 1) * (m + 1));
		var vertices = this.vertices;
		// Normals.
		this.normals = new Float32Array(3 * (n + 1) * (m + 1));
		var normals = this.normals;
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
				var y = r * Math.sin(u);  // Was vorher z
				var z = (R + r * Math.cos(u)) * Math.sin(v);  // Was vorher y

				// Set vertex positions.
				vertices[iVertex * 3] = x;
				vertices[iVertex * 3 + 1] = y;
				vertices[iVertex * 3 + 2] = z;

				// Calc and set normals (auch rotiert).
				var nx = Math.cos(u) * Math.cos(v);
				var ny = Math.sin(u);  // War vorher nz
				var nz = Math.cos(u) * Math.sin(v);  // War vorher ny
				normals[iVertex * 3] = nx;
				normals[iVertex * 3 + 1] = ny;
				normals[iVertex * 3 + 2] = nz;

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
				// Two Triangles mit korrekter Counter-Clockwise Windungsreihenfolge.
				if (j > 0 && i > 0) {
					// Erstes Dreieck (CCW)
					indicesTris[iTris++] = iVertex - (m + 1);
					indicesTris[iTris++] = iVertex - 1;
					indicesTris[iTris++] = iVertex;

					// Zweites Dreieck (CCW)
					indicesTris[iTris++] = iVertex - (m + 1);
					indicesTris[iTris++] = iVertex - (m + 1) - 1;
					indicesTris[iTris++] = iVertex - 1;
				}
			}
		}
	}

	return {
		createVertexData: createVertexData
	}

}());
