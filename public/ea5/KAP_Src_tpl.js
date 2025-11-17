var app = (function () {

	var gl;

	// The shader program object is also used to
	// store attribute and uniform locations.
	var prog;

	// Array of model objects.
	var models = [];

	// Sphere subdivision iterations
	var sphereIterations = 0;

	var camera = {
		// Initial position of the camera.
		eye: [0, 1, 4],
		// Point to look at.
		center: [0, 0, 0],
		// Roll and pitch of the camera.
		up: [0, 1, 0],
		// Opening angle given in radian.
		// radian = degree*2*PI/360.
		fovy: 60.0 * Math.PI / 180,
		// Camera near plane dimensions:
		// value for left right top bottom in projection.
		lrtb: 2.0,
		// View matrix.
		vMatrix: mat4.create(),
		// Projection matrix.
		pMatrix: mat4.create(),
		// Projection types: ortho, perspective, frustum.
		projectionType: "perspective",
		// Angle to Z-Axis for camera when orbiting the center
		// given in radian.
		zAngle: 0,
		// Distance in XZ-Plane from center when orbiting.
		distance: 4,
		// Camera rotation angle around X-axis (pitch up/down)
		xRotation: 0,
		// Orbital movement angles
		orbitAngleY: 0,  // Horizontal orbit around Y-axis - startet von vorne (0 Grad)
		orbitAngleX: 0.2,  // Vertical orbit angle - leicht von oben (ca. 11 Grad)  
		orbitRadius: 4,  // Distance from center
	};

	function start() {
		init();
		animate(); // Start animation loop instead of single render
	}

	function animate() {
		render();
		requestAnimationFrame(animate);
	}

	function init() {
		initWebGL();
		initShaderProgram();
		initUniforms()
		initModels();
		initEventHandler();
		initPipline();
	}

	function initWebGL() {
		// Get canvas and WebGL context.
		canvas = document.getElementById('canvas');
		gl = canvas.getContext('experimental-webgl');
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	}

	/**
	 * Init pipeline parameters that will not change again.
	 * If projection or viewport change, their setup must
	 * be in render function.
	 */
	function initPipline() {
		gl.clearColor(.95, .95, .95, 1);

		// Backface culling deaktiviert für bessere Sichtbarkeit des Torus.
		gl.frontFace(gl.CCW);
		gl.disable(gl.CULL_FACE);  // Deaktiviert, damit alle Seiten sichtbar sind
		// gl.cullFace(gl.BACK);

		// Depth(Z)-Buffer.
		gl.enable(gl.DEPTH_TEST);

		// Polygon offset of rastered Fragments.
		gl.enable(gl.POLYGON_OFFSET_FILL);
		gl.polygonOffset(0.5, 0);

		// Set viewport.
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

		// Init camera.
		// Set projection aspect ratio.
		camera.aspect = gl.viewportWidth / gl.viewportHeight;
	}

	function initShaderProgram() {
		// Init vertex shader.
		var vs = initShader(gl.VERTEX_SHADER, "vertexshader");
		// Init fragment shader.
		var fs = initShader(gl.FRAGMENT_SHADER, "fragmentshader");
		// Link shader into a shader program.
		prog = gl.createProgram();
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.bindAttribLocation(prog, 0, "aPosition");
		gl.linkProgram(prog);
		gl.useProgram(prog);
	}

	/**
	 * Create and init shader from source.
	 * 
	 * @parameter shaderType: openGL shader type.
	 * @parameter SourceTagId: Id of HTML Tag with shader source.
	 * @returns shader object.
	 */
	function initShader(shaderType, SourceTagId) {
		var shader = gl.createShader(shaderType);
		var shaderSource = document.getElementById(SourceTagId).text;
		gl.shaderSource(shader, shaderSource);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.log(SourceTagId + ": " + gl.getShaderInfoLog(shader));
			return null;
		}
		return shader;
	}

	function initUniforms() {
		// Projection Matrix.
		prog.pMatrixUniform = gl.getUniformLocation(prog, "uPMatrix");

		// Model-View-Matrix.
		prog.mvMatrixUniform = gl.getUniformLocation(prog, "uMVMatrix");
	}

	function initModels() {
		// fill-style
		var fs = "fillwireframe";
		createModel("torus", fs);
		createModel("sphere", fs, sphereIterations);
	}

	/**
	 * Create model object, fill it and push it in models array.
	 * 
	 * @parameter geometryname: string with name of geometry.
	 * @parameter fillstyle: wireframe, fill, fillwireframe.
	 * @parameter parameters: optional parameters for geometry creation.
	 */
	function createModel(geometryname, fillstyle, parameters) {
		var model = {};
		model.fillstyle = fillstyle;
		model.geometryname = geometryname;
		initDataAndBuffers(model, geometryname, parameters);
		// Create and initialize Model-View-Matrix.
		model.mvMatrix = mat4.create();

		models.push(model);
	}

	/**
	 * Init data and buffers for model object.
	 * 
	 * @parameter model: a model object to augment with data.
	 * @parameter geometryname: string with name of geometry.
	 * @parameter parameters: optional parameters for geometry creation.
	 */
	function initDataAndBuffers(model, geometryname, parameters) {
		// Provide model object with vertex data arrays.
		// Fill data arrays for Vertex-Positions, Normals, Index data:
		// vertices, normals, indicesLines, indicesTris;
		// Pointer this refers to the window.
		if (parameters) {
			this[geometryname]['createVertexData'].call(model, parameters);
		} else {
			this[geometryname]['createVertexData'].apply(model);
		}

		// Setup position vertex buffer object.
		model.vboPos = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
		gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);
		// Bind vertex buffer to attribute variable.
		prog.positionAttrib = gl.getAttribLocation(prog, 'aPosition');
		gl.enableVertexAttribArray(prog.positionAttrib);

		// Setup normal vertex buffer object.
		model.vboNormal = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
		gl.bufferData(gl.ARRAY_BUFFER, model.normals, gl.STATIC_DRAW);
		// Bind buffer to attribute variable.
		prog.normalAttrib = gl.getAttribLocation(prog, 'aNormal');
		gl.enableVertexAttribArray(prog.normalAttrib);

		// Setup lines index buffer object.
		model.iboLines = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesLines,
			gl.STATIC_DRAW);
		model.iboLines.numberOfElements = model.indicesLines.length;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		// Setup triangle index buffer object.
		model.iboTris = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesTris,
			gl.STATIC_DRAW);
		model.iboTris.numberOfElements = model.indicesTris.length;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

	function initEventHandler() {

		window.onkeydown = function (evt) {
			var key = evt.which ? evt.which : evt.keyCode;
			var c = String.fromCharCode(key);
			// console.log(evt);

			// Handle arrow keys for manual camera control
			switch (key) {
				case 38: // Arrow Up
					camera.orbitAngleX = Math.min(camera.orbitAngleX + Math.PI / 12, Math.PI / 2 - 0.1); // Nach oben schauen
					break;
				case 40: // Arrow Down
					camera.orbitAngleX = Math.max(camera.orbitAngleX - Math.PI / 12, -Math.PI / 2 + 0.1); // Nach unten schauen
					break;
				case 37: // Arrow Left
					camera.orbitAngleY -= Math.PI / 12; // Rotate left by 15 degrees
					break;
				case 39: // Arrow Right
					camera.orbitAngleY += Math.PI / 12; // Rotate right by 15 degrees
					break;
				case 78: // 'N' key
					if (evt.shiftKey) {
						// Shift+N: Decrease camera distance (zoom in)
						camera.orbitRadius = Math.max(camera.orbitRadius - 0.5, 0.5); // Minimum distance 0.5
						camera.distance = camera.orbitRadius; // Sync both distance values
					} else {
						// N: Increase camera distance (zoom out)
						camera.orbitRadius = Math.min(camera.orbitRadius + 0.5, 20); // Maximum distance 20
						camera.distance = camera.orbitRadius; // Sync both distance values
					}
					break;
				case 32: // Spacebar
					// Reset camera to initial position
					camera.orbitAngleY = 0;
					camera.orbitAngleX = 0.2;
					camera.orbitRadius = 4;
					camera.distance = 4;
					console.log("Camera reset to initial position");
					break;
			}

			// Render the scene again on any key pressed.
			render();
		};
	}

	/**
	 * Run the rendering pipeline.
	 */
	function render() {
		// Clear framebuffer and depth-/z-buffer.
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		setProjection();

		// Calculate camera position using spherical coordinates
		// orbitAngleY: azimuth angle (horizontal rotation around Y-axis)
		// orbitAngleX: polar angle (vertical angle from horizontal plane)
		var cameraX = camera.orbitRadius * Math.cos(camera.orbitAngleX) * Math.sin(camera.orbitAngleY);
		var cameraY = camera.orbitRadius * Math.sin(camera.orbitAngleX);
		var cameraZ = camera.orbitRadius * Math.cos(camera.orbitAngleX) * Math.cos(camera.orbitAngleY);

		// Create view matrix to look at center from camera position
		mat4.lookAt(camera.vMatrix,
			[cameraX, cameraY, cameraZ],  // camera position
			[0, 0, 0],                     // look at center
			[0, 1, 0]);                    // up vector

		// Loop over models.
		for (var i = 0; i < models.length; i++) {
			// Start with identity matrix for each model
			mat4.identity(models[i].mvMatrix);

			// Position models side by side in world space
			if (i == 0) {
				// Torus on the left
				mat4.translate(models[i].mvMatrix, models[i].mvMatrix, [-0.8, 0, 0]);
			} else if (i == 1) {
				// Sphere on the right
				mat4.translate(models[i].mvMatrix, models[i].mvMatrix, [0.8, 0.5, 0]);
			}

			// Apply view transformation to model
			mat4.multiply(models[i].mvMatrix, camera.vMatrix, models[i].mvMatrix);

			// Set uniforms for model.
			gl.uniformMatrix4fv(prog.mvMatrixUniform, false,
				models[i].mvMatrix);

			draw(models[i]);
		}
	}

	function setProjection() {
		// Set projection Matrix.
		switch (camera.projectionType) {
			case ("ortho"):
				var v = camera.lrtb;
				mat4.ortho(camera.pMatrix, -v, v, -v, v, -10, 10);
				break;
			case ("perspective"):
				mat4.perspective(camera.pMatrix, camera.fovy, camera.aspect, 0.1, 100);
				break;
		}
		// Set projection uniform.
		gl.uniformMatrix4fv(prog.pMatrixUniform, false, camera.pMatrix);
	}

	function draw(model) {
		// Setup position VBO.
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
		gl.vertexAttribPointer(prog.positionAttrib, 3, gl.FLOAT, false, 0, 0);

		// Setup normal VBO.
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
		gl.vertexAttribPointer(prog.normalAttrib, 3, gl.FLOAT, false, 0, 0);

		// Always use 16-bit indices for compatibility
		var indexType = gl.UNSIGNED_SHORT;

		// Setup rendering tris.
		var fill = (model.fillstyle.search(/fill/) != -1);
		if (fill) {
			gl.enableVertexAttribArray(prog.normalAttrib);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
			gl.drawElements(gl.TRIANGLES, model.iboTris.numberOfElements, indexType, 0);
		}

		// Setup rendering lines.
		var wireframe = (model.fillstyle.search(/wireframe/) != -1);
		if (wireframe) {
			gl.disableVertexAttribArray(prog.normalAttrib);
			gl.vertexAttrib3f(prog.normalAttrib, 0, 0, 0);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
			gl.drawElements(gl.LINES, model.iboLines.numberOfElements, indexType, 0);
		}
	}

	function updateSphereIterations(newIterations) {
		sphereIterations = Math.max(0, newIterations);

		// Find and update the sphere model
		for (var i = 0; i < models.length; i++) {
			if (models[i].geometryname === 'sphere') {
				// Recreate vertex data
				sphere.createVertexData.call(models[i], sphereIterations);

				// Update buffers
				gl.bindBuffer(gl.ARRAY_BUFFER, models[i].vboPos);
				gl.bufferData(gl.ARRAY_BUFFER, models[i].vertices, gl.STATIC_DRAW);

				gl.bindBuffer(gl.ARRAY_BUFFER, models[i].vboNormal);
				gl.bufferData(gl.ARRAY_BUFFER, models[i].normals, gl.STATIC_DRAW);

				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, models[i].iboLines);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, models[i].indicesLines, gl.STATIC_DRAW);
				models[i].iboLines.numberOfElements = models[i].indicesLines.length;

				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, models[i].iboTris);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, models[i].indicesTris, gl.STATIC_DRAW);
				models[i].iboTris.numberOfElements = models[i].indicesTris.length;

				break;
			}
		}

		render();
	}

	// App interface.
	return {
		start: start,
		updateSphereIterations: updateSphereIterations
	}

}());
