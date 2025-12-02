var cylinder = (function () {

	function createVertexData() {
		var n = 32;
		var m = 32;

		// Positions (add 2 for top and bottom centers).
		this.vertices = new Float32Array(3 * ((n + 1) * (m + 1) + 2));
		var vertices = this.vertices;
		// Normals.
		this.normals = new Float32Array(3 * ((n + 1) * (m + 1) + 2));
		var normals = this.normals;
		// Index data.
		// Add radial lines for caps: 2 centers * n lines
		this.indicesLines = new Uint16Array(2 * 2 * n * m + 2 * 2 * n);
		var indicesLines = this.indicesLines;
		// Add triangles for caps: 2 * n triangles
		this.indicesTris = new Uint16Array(3 * 2 * n * m + 3 * 2 * n);
		var indicesTris = this.indicesTris;

		var du = 2 * Math.PI / n;
		var dh = 2 / m;
		var r = 1;
		var h = 1;
		// Counter for entries in index array.
		var iLines = 0;
		var iTris = 0;

		// Loop angle u (around the cylinder).
		for (var i = 0, u = 0; i <= n; i++, u += du) {
			// Loop height (along the cylinder axis).
			for (var j = 0, height = -h; j <= m; j++, height += dh) {

				var iVertex = i * (m + 1) + j;

				var x = r * Math.cos(u);
				var y = height;
				var z = r * Math.sin(u);

				// Set vertex positions.
				vertices[iVertex * 3] = x;
				vertices[iVertex * 3 + 1] = y;
				vertices[iVertex * 3 + 2] = z;

				// Calc and set normals (pointing outward from cylinder axis).
				var nx = Math.cos(u);
				var ny = 0;
				var nz = Math.sin(u);
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

		// Add top and bottom centers (positions and normals).
		var baseCount = (n + 1) * (m + 1);
		var bottomCenterIndex = baseCount;
		var topCenterIndex = baseCount + 1;

		// Bottom center at y = -h
		vertices[bottomCenterIndex * 3] = 0;
		vertices[bottomCenterIndex * 3 + 1] = -h;
		vertices[bottomCenterIndex * 3 + 2] = 0;
		normals[bottomCenterIndex * 3] = 0;
		normals[bottomCenterIndex * 3 + 1] = -1;
		normals[bottomCenterIndex * 3 + 2] = 0;

		// Top center at y = +h
		vertices[topCenterIndex * 3] = 0;
		vertices[topCenterIndex * 3 + 1] = h;
		vertices[topCenterIndex * 3 + 2] = 0;
		normals[topCenterIndex * 3] = 0;
		normals[topCenterIndex * 3 + 1] = 1;
		normals[topCenterIndex * 3 + 2] = 0;

		// Build cap triangles and optional radial lines.
		for (var k = 1; k <= n; k++) {
			// Ring vertices at bottom (j = 0) and top (j = m)
			var iBottom = k * (m + 1);
			var iBottomPrev = (k - 1) * (m + 1);
			var iTop = k * (m + 1) + m;
			var iTopPrev = (k - 1) * (m + 1) + m;

			// Bottom cap triangle (normal down): center, prev, current
			indicesTris[iTris++] = bottomCenterIndex;
			indicesTris[iTris++] = iBottomPrev;
			indicesTris[iTris++] = iBottom;

			// Top cap triangle (normal up): center, current, prev
			indicesTris[iTris++] = topCenterIndex;
			indicesTris[iTris++] = iTop;
			indicesTris[iTris++] = iTopPrev;

			// Radial lines from centers to ring vertices (optional wireframe)
			indicesLines[iLines++] = bottomCenterIndex;
			indicesLines[iLines++] = iBottom;
			indicesLines[iLines++] = topCenterIndex;
			indicesLines[iLines++] = iTop;
		}
	}

	return {
		createVertexData: createVertexData
	}

}());
