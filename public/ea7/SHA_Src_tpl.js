var app = (function () {

	var gl;

	// The shader program object is also used to
	// store attribute and uniform locations.
	var prog;

	// Array of model objects.
	var models = [];

	// Model that is target for user input.
	var interactiveModel;

	var camera = {
		// Initial position of the camera.
		eye: [0, 1, 4],
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
		// Rotation angles for the scene (controlled by arrow keys).
		rotateX: 0,
		rotateY: 0,
	};

	function start() {
		init();
		render();
	}

	function init() {
		initWebGL();
		initShaderProgram();
		initUniforms();
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
	 * Init pipeline parmters that will not change again.
	 * If projection or viewport change,
	 * thier setup must be in render function.
	 */
	function initPipline() {
		gl.clearColor(.05, .25, .45, 0.1);

		// Backface culling.
		gl.frontFace(gl.CCW);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);

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

		// Normal Matrix.
		prog.nMatrixUniform = gl.getUniformLocation(prog, "uNMatrix");

		// Color.
		prog.colorUniform = gl.getUniformLocation(prog, "uColor");

		// Plane flag.
		prog.isPlaneUniform = gl.getUniformLocation(prog, "uIsPlane");
	}

	function initModels() {
		// fillstyle
		var fs = "fill";
		createModel("plane", fs, [0.2, 0.8, 0.4, 1], [0, 0, 0], [0, 0, 0], [1, 1, 1]);
		createModel("torus", fs, [0, 0.5, 0.5, 0.2], [0, 0.2, 0], [0, 0, 0], [1, 1, 1]);
		createModel("torus", fs, [0, 0.5, 0.5, 0.2], [0, 0.18, 0.4], [0, 0, 0], [1, 1, 1]);
		createModel("torus", fs, [0, 0.5, 0.5, 0.2], [0, 0.16, 0.8], [0, 0, 0], [1, 1, 1]);
		createModel("torus", fs, [0, 0.5, 0.5, 0.2], [0, 0.14, 1.2], [0, 0, 0], [1, 1, 1]);
		createModel("torus", fs, [0, 0.5, 0.5, 0.2], [0, 0.12, 1.6], [0, 0, 0], [1, 1, 1]);
		createModel("torus", fs, [0, 0.5, 0.5, 0.2], [-2.5, 0.1, 1.7], [0, 0, 0], [1, 1, 1]);
		createModel("torus", fs, [0, 0.5, 0.5, 0.2], [2.3, -0.08, 1.8], [0, 0, 0], [1, 1, 1]);
		createModel("torus", fs, [0, 0.5, 0.5, 0.2], [-2, 0.06, 1.9], [0, 0, 0], [1, 1, 1]);
		createModel("sphere", fs, [0, 1, 0, 0.4], [2, 1.5, 1], [0, 0, 0], [0.1, 0.1, 0.1]);
		createModel("sphere", fs, [0, 1, 1, 0.4], [1.5, 1.8, 1], [0, 0, 0], [0.1, 0.1, 0.1]);
		createModel("sphere", fs, [0, 0, 1, 0.4], [0, 1.7, 2], [0, 0, 0], [0.1, 0.1, 0.1]);


		createModel("cylinder", fs, [0, 0.5, 0.5, 0.2], [2.015399401826156, 0.2813876362284284, 0.06151267646172956], [0.3027766146198079, 1.1324977967113057, -0.3372495734260581], [0.1, 0.6, 0.1]);
		createModel("cylinder", fs, [0, 0.5, 0.5, 0.2], [1.4489804392162227, 0.28499700366438946, 1.4102616968092951], [-0.4042883983901558, 4.400318933380443, -0.31430137468121333], [0.1, 0.6, 0.1]);
		createModel("cylinder", fs, [0, 0.5, 0.5, 0.2], [0.028281430481684355, 0.08704218467674577, 1.9458895494884083], [0.1093189182828281, 0.2825497811015896, 1.5707963267948966], [0.1, 0.6, 0.1]);
		createModel("cylinder", fs, [0, 0.5, 0.5, 0.2], [-1.5124996768750272, 0.2770989657335585, 1.3215225502078052], [-0.16432806928240984, 1.7320269476470171, -0.4935059510077742], [0.1, 0.6, 0.1]);
		createModel("cylinder", fs, [0, 0.5, 0.5, 0.2], [-1.9757725770998054, 0.28792762790226656, -0.08176830747113442], [-0.2779480658106461, 3.946341343181332, 0.40157807193088396], [0.1, 0.6, 0.1]);
		createModel("cylinder", fs, [0, 0.5, 0.5, 0.2], [-1.3456857262814326, 0.26344653452471406, -1.4043360930215179], [0.17386096702853648, 1.9053243520868985, -0.2733943308974019], [0.1, 0.6, 0.1]);
		createModel("cylinder", fs, [0, 0.5, 0.5, 0.2], [-0.013701765435756488, 0.2510859733748733, -1.9816945512632205], [0.21408411526004162, 2.827660037268393, -0.1703438807693623], [0.1, 0.6, 0.1]);
		createModel("cylinder", fs, [0, 0.5, 0.5, 0.2], [1.3298764570323933, 0.09115465020120929, -1.343381205073752], [0.1047811300962431, 4.499632421815999, 1.5707963267948966], [0.1, 0.6, 0.1]);


		// Select one model that can be manipulated interactively by user.
		interactiveModel = models[0];
	}

	/**
	 * Create model object, fill it and push it in models array.
	 * @parameter geometryname: string with name of geometry.
	 * @parameter fillstyle: wireframe, fill, fillwireframe.
	 */
	function createModel(geometryname, fillstyle, color, translate, rotate, scale) {
		var model = {};
		model.fillstyle = fillstyle;
		model.color = color;
		model.geometry = geometryname;
		initDataAndBuffers(model, geometryname);
		initTransformations(model, translate, rotate, scale);

		models.push(model);
	}

	/**
	 * Set scale, rotation and transformation for model.
	 */
	function initTransformations(model, translate, rotate, scale) {
		// Store transformation vectors.
		model.translate = translate;
		model.rotate = rotate;
		model.scale = scale;

		// Create and initialize Model-Matrix.
		model.mMatrix = mat4.create();

		// Create and initialize Model-View-Matrix.
		model.mvMatrix = mat4.create();

		// Create and initialize Normal Matrix.
		model.nMatrix = mat3.create();
	}

	/**
	 * Init data and buffers for model object.
	 * @parameter model: a model object to augment with data.
	 * @parameter geometryname: string with name of geometry.
	 */
	function initDataAndBuffers(model, geometryname) {
		// Provide model object with vertex data arrays.
		// Fill data arrays for Vertex-Positions, Normals, Index data:
		// vertices, normals, indicesLines, indicesTris;
		// Pointer this refers to the window.
		this[geometryname]['createVertexData'].apply(model);

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
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesLines, gl.STATIC_DRAW);
		model.iboLines.numberOfElements = model.indicesLines.length;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

		// Setup triangle index buffer object.
		model.iboTris = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indicesTris, gl.STATIC_DRAW);
		model.iboTris.numberOfElements = model.indicesTris.length;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

	function initEventHandler() {
		// Rotation step for scene.
		var deltaRotate = Math.PI / 36;
		// Translation step for camera movement.
		var deltaTranslate = 0.1;

		window.onkeydown = function (evt) {
			var key = evt.which ? evt.which : evt.keyCode;
			var c = String.fromCharCode(key);
			//console.log(evt);

			// WASD: Move camera in XY-plane.
			switch (c) {
				case ('W'):
					// Move camera up (positive Y).
					camera.eye[1] += deltaTranslate;
					break;
				case ('S'):
					// Move camera down (negative Y).
					camera.eye[1] -= deltaTranslate;
					break;
				case ('A'):
					// Move camera left (negative X).
					camera.eye[0] -= deltaTranslate;
					break;
				case ('D'):
					// Move camera right (positive X).
					camera.eye[0] += deltaTranslate;
					break;
			}

			// Arrow keys: Rotate scene.
			switch (key) {
				case (37): // Left arrow
					camera.rotateY -= deltaRotate;
					break;
				case (39): // Right arrow
					camera.rotateY += deltaRotate;
					break;
				case (38): // Up arrow
					camera.rotateX -= deltaRotate;
					break;
				case (40): // Down arrow
					camera.rotateX += deltaRotate;
					break;
			}

			// Change projection of scene.
			switch (c) {
				case ('O'):
					camera.projectionType = "ortho";
					camera.lrtb = 2;
					break;
				case ('F'):
					camera.projectionType = "frustum";
					camera.lrtb = 1.2;
					break;
				case ('P'):
					camera.projectionType = "perspective";
					break;
			}

			// Camera fovy and near plane.
			switch (c) {
				case ('V'):
					// Camera fovy in radian.
					camera.fovy += (evt.shiftKey ? -1 : 1) * 5 * Math.PI / 180;
					break;
				case ('B'):
					// Camera near plane dimensions.
					camera.lrtb += (evt.shiftKey ? -1 : 1) * 0.1;
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

		// Set view matrix: camera looks along negative Z-axis from eye position.
		var lookAtPoint = [camera.eye[0], camera.eye[1], camera.eye[2] - 1];
		mat4.lookAt(camera.vMatrix, camera.eye, lookAtPoint, camera.up);

		// Apply scene rotation to view matrix.
		mat4.rotateX(camera.vMatrix, camera.vMatrix, camera.rotateX);
		mat4.rotateY(camera.vMatrix, camera.vMatrix, camera.rotateY);

		// Loop over models.
		for (var i = 0; i < models.length; i++) {
			// Update modelview for model.
			updateTransformations(models[i]);

			// Set uniforms for model.
			gl.uniform4fv(prog.colorUniform, models[i].color);
			gl.uniformMatrix4fv(prog.mvMatrixUniform, false, models[i].mvMatrix);
			gl.uniformMatrix3fv(prog.nMatrixUniform, false, models[i].nMatrix);
			// Set plane toggle depending on geometry.
			gl.uniform1i(prog.isPlaneUniform, models[i].geometry === "plane" ? 1 : 0);

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
			case ("frustum"):
				var v = camera.lrtb;
				mat4.frustum(camera.pMatrix, -v / 2, v / 2, -v / 2, v / 2, 1, 10);
				break;
			case ("perspective"):
				mat4.perspective(camera.pMatrix, camera.fovy, camera.aspect, 1, 10);
				break;
		}
		// Set projection uniform.
		gl.uniformMatrix4fv(prog.pMatrixUniform, false, camera.pMatrix);
	}

	/**
	 * Update model-view matrix for model.
	 */
	function updateTransformations(model) {

		// Use shortcut variables.
		var mMatrix = model.mMatrix;
		var mvMatrix = model.mvMatrix;

		// Reset matrices to identity.
		mat4.identity(mMatrix);
		mat4.identity(mvMatrix);

		// Translate.
		mat4.translate(mMatrix, mMatrix, model.translate);
		// Rotate.
		mat4.rotateX(mMatrix, mMatrix, model.rotate[0]);
		mat4.rotateY(mMatrix, mMatrix, model.rotate[1]);
		mat4.rotateZ(mMatrix, mMatrix, model.rotate[2]);
		// Scale
		mat4.scale(mMatrix, mMatrix, model.scale);

		// Combine view and model matrix
		// by matrix multiplication to mvMatrix.
		mat4.multiply(mvMatrix, camera.vMatrix, mMatrix);

		// Calculate normal matrix from model matrix.
		mat3.normalFromMat4(model.nMatrix, mvMatrix);
	}

	function draw(model) {
		// Setup position VBO.
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
		gl.vertexAttribPointer(prog.positionAttrib, 3, gl.FLOAT, false, 0, 0);

		// Setup normal VBO.
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
		gl.vertexAttribPointer(prog.normalAttrib, 3, gl.FLOAT, false, 0, 0);

		// Setup rendering tris.
		var fill = (model.fillstyle.search(/fill/) != -1);
		if (fill) {
			gl.enableVertexAttribArray(prog.normalAttrib);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
			gl.drawElements(gl.TRIANGLES, model.iboTris.numberOfElements, gl.UNSIGNED_SHORT, 0);
		}

		// Setup rendering lines.
		var wireframe = (model.fillstyle.search(/wireframe/) != -1);
		if (wireframe) {
			gl.uniform4fv(prog.colorUniform, [0., 0., 0., 1.]);
			gl.disableVertexAttribArray(prog.normalAttrib);
			gl.vertexAttrib3f(prog.normalAttrib, 0, 0, 0);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
			gl.drawElements(gl.LINES, model.iboLines.numberOfElements, gl.UNSIGNED_SHORT, 0);
		}
	}

	// App interface.
	return {
		start: start
	};

}());
