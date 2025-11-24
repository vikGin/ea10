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
		eye: [0, 2, 1],
		// Point to look at.
		center: [0, 0, 0],
		// Roll and pitch of the camera.
		up: [0, 2, 0],
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
		zAngle: 0.25 * Math.PI,
		// Distance in XZ-Plane from center when orbiting.
		distance: 4.5,
	};

	// Animation control
	var animationEnabled = true; // true = rotate, false = paused
	var lastTime = null; // timestamp of previous frame
	// Torus rotation speed in radians per second (approx previous behavior)
	var torusRotationSpeed = 4;

	// Sphere circular-path parameters (set in code)
	// radius of the circular path (world units)
	var circleRadius = 1.2;
	// current global angle of the circular path (radians)
	var circleAngle = 0.0; // kept as fallback
	// angular speed of the circular path (radians per second)
	var circleAngularSpeed = 0.8; // default per-sphere speed fallback
	// counter for spheres (assigned when createModel is called)
	var sphereCounter = 0;

	function start() {
		init();
		// Initialize timestamp and start animation loop.
		lastTime = performance.now();
		window.requestAnimationFrame(render);
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

		// Backface culling.
		gl.frontFace(gl.CCW);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);

		// Depth(Z)-Buffer.
		gl.enable(gl.DEPTH_TEST);

		// Polygon offset of rastered Fragments.
		gl.enable(gl.POLYGON_OFFSET_FILL);
		gl.polygonOffset(0, 0);

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

		prog.colorUniform = gl.getUniformLocation(prog, "uColor");

		prog.nMatrixUniform = gl.getUniformLocation(prog, "uNMatrix");
	}

	function initModels() {
		// fillstyle
		var fs = "fillwireframe";
		createModel("torus", fs, [0, 1, 0.5, 1], [0, 0, 0], [Math.PI / 4, 0, 0], [1, 1, 1]);
		createModel("plane", "wireframe", [1, .5, 1, .8], [0, -1, 0], [0, 0, 0], [1, 1, 1]);
		// Set explicit starting angles (radians) for the four spheres:
		// 1: pi, 2: 0.5*pi, 3: 1.5*pi, 4: 2*pi
		createModel("sphere", fs, [0, 0, 1, 1], [1, 0, 1], [0, 0, 0], [0.1, 0.1, 0.1], { radius: 1.25, speed: 2, direction: [0, 1, 1], phase: 0, angle: Math.PI });
		createModel("sphere", fs, [0, 1, 1, 1], [0, 1, 0], [0, 0, 0], [0.15, 0.15, 0.15], { radius: 3, speed: 2, direction: [0, 1, 1], phase: 0, angle: 0.5 * Math.PI });
		createModel("sphere", fs, [1, 0, 0, 1], [0, 1, 1], [0, 0, 0], [0.25, 0.25, 0.25], { radius: 1.25, speed: 2, direction: [0, -1, -1], phase: 0, angle: 1.5 * Math.PI });
		createModel("sphere", fs, [1, 0, 1, 1], [1, 1, 0], [0, 0, 0], [0.2, 0.2, 0.2], { radius: 3, speed: 2, direction: [0, -1, -1], phase: 0, angle: 2 * Math.PI });

		// Select one model that can be manipulated interactively by user.
		interactiveModel = models[0];

		// Mark the torus (models[0]) to rotate around its own local X axis.
		// This flag is used in the render loop and in `updateTransformations`.
		interactiveModel.rotateLocal = true;
	}

	/**
	 * Create model object, fill it and push it in models array.
	 * 
	 * @parameter geometryname: string with name of geometry.
	 * @parameter fillstyle: wireframe, fill, fillwireframe.
	 */
	function createModel(geometryname, fillstyle, color, translate, rotate, scale, pathParams) {
		var model = {};
		// Keep geometry name for runtime identification
		model.name = geometryname;
		// If it's a sphere, assign a sequential index for placement on the circle
		if (geometryname === 'sphere') {
			model.sphereIndex = sphereCounter++;
			// Attach path parameters. Allow callers to specify only `radius` and `speed`.
			// Other parameters get sensible defaults; `angle` stores current angular position.
			var defaultPath = {
				radius: circleRadius,
				speed: circleAngularSpeed,
				azimuth: 0.0,
				elevation: 0.0,
				angle: 0.0
			};
			model.path = Object.assign({}, defaultPath, pathParams || {});
		}
		model.fillstyle = fillstyle;
		model.color = color;

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
	}

	/**
	 * Init data and buffers for model object.
	 * 
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
		// Rotation step.
		var deltaRotate = Math.PI / 36;
		var deltaTranslate = 0.05;
		var deltaScale = 0.05;

		// Key event handler.

		window.onkeydown = function (evt) {
			var key = evt.which ? evt.which : evt.keyCode;
			var c = String.fromCharCode(key);
			// console.log(evt);
			// Use shift key to change sign.
			var sign = evt.shiftKey ? -1 : 1;

			// Change projection of scene.
			switch (c) {
				case ('O'):
					camera.projectionType = "ortho";
					camera.lrtb = 4;
					break;
				case ('F'):
					camera.projectionType = "frustum";
					camera.lrtb = 1.2;
					break;
				case ('P'):
					camera.projectionType = "perspective";
					break;
				case ('S'):
					// Scale model.
					interactiveModel.scale[0] *= 1 + sign * deltaScale;
					interactiveModel.scale[1] *= 1 - sign * deltaScale;
					interactiveModel.scale[2] *= 1 + sign * deltaScale;
					break;
				case ('C'):
					// Orbit camera.
					camera.zAngle += sign * deltaRotate;
					break;
				case ('H'):
					// Move camera up and down.
					camera.eye[1] += sign * deltaTranslate;
					break;
				case ('D'):
					// Camera distance to center.
					camera.distance += sign * deltaTranslate;
					break;
				case ('V'):
					// Camera fovy in radian.
					camera.fovy += sign * 5 * Math.PI / 180;
					break;
				case ('B'):
					// Camera near plane dimensions.
					camera.lrtb += sign * 0.1;
					break;
				case ('K'):
					// K toggles animation on/off
					animationEnabled = !animationEnabled;
					// Prevent default scrolling on space
					evt.preventDefault && evt.preventDefault();
					// If animation was just enabled, (re)start the RAF loop.
					if (animationEnabled) {
						lastTime = performance.now();
						window.requestAnimationFrame(render);
					}
					break;
			}
			// If animation is disabled, render one frame to reflect changes.
			if (!animationEnabled) {
				// ensure a frame is drawn when paused (e.g., after transforms)
				window.requestAnimationFrame(function (t) { render(t); });
			}
		};
	}

	/**
	 * Run the rendering pipeline.
	 */
	function render(time) {

		// time is a DOMHighResTimeStamp from requestAnimationFrame
		if (!time) time = performance.now();
		// Compute delta time in seconds
		var delta = 0;
		if (lastTime !== null) {
			delta = (time - lastTime) / 1000.0;
		}
		lastTime = time;

		// Clear framebuffer and depth-/z-buffer.
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


		setProjection();

		calculateCameraOrbit();

		// Set view matrix depending on camera.
		mat4.lookAt(camera.vMatrix, camera.eye, camera.center, camera.up);

		// Loop over models.

		// Advance each sphere's path angle independently when animation is enabled.
		if (animationEnabled) {
			for (var mi = 0; mi < models.length; mi++) {
				var mm = models[mi];
				if (mm.name === 'sphere') {
					var p = mm.path || {};
					var sp = (typeof p.speed === 'number') ? p.speed : circleAngularSpeed;
					p.angle = (typeof p.angle === 'number') ? p.angle + sp * delta : sp * delta;
					// wrap angle to [0,2PI)
					if (p.angle > Math.PI * 2) p.angle -= Math.PI * 2;
					mm.path = p;
				}
			}
		}

		for (var i = 0; i < models.length; i++) {

			// If model is marked for local rotation and animation is enabled,
			// increment its X-rotation based on elapsed time so it spins
			// around its own X axis in a time-consistent way.
			if (models[i].rotateLocal && animationEnabled) {
				models[i].rotate[0] += torusRotationSpeed * delta; // radians
				if (models[i].rotate[0] > Math.PI * 2) models[i].rotate[0] -= Math.PI * 2;
			}

			// Update modelview for model.
			updateTransformations(models[i]);

			// Set color for model.
			gl.uniform4fv(prog.colorUniform, models[i].color);

			// Set uniforms for model.
			gl.uniformMatrix4fv(prog.mvMatrixUniform, false,
				models[i].mvMatrix);
			models[i].nMatrix = mat3.create();
			mat3.normalFromMat4(models[i].nMatrix, models[i].mMatrix);
			gl.uniformMatrix3fv(prog.nMatrixUniform, false,
				models[i].nMatrix);

			draw(models[i]);
		}

		// Schedule next frame only if animation is enabled. When animation is
		// paused we do not continuously request frames to save CPU.
		if (animationEnabled) {
			window.requestAnimationFrame(render);
		}
	}

	function calculateCameraOrbit() {
		// Calculate x,z position/eye of camera orbiting the center.
		var x = 0, z = 2;
		camera.eye[x] = camera.center[x];
		camera.eye[z] = camera.center[z];
		camera.eye[x] += camera.distance * Math.sin(camera.zAngle);
		camera.eye[z] += camera.distance * Math.cos(camera.zAngle);
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
				mat4.perspective(camera.pMatrix, camera.fovy,
					camera.aspect, 1, 10);
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

		mat4.identity(mMatrix);
		mat4.identity(mvMatrix);



		// If this model is a sphere, place it on the circular path.
		if (model.name === 'sphere') {
			// Determine torus center (assume torus is models[0])
			var torusCenter = [0, 0, 0];
			if (models[0] && models[0].translate) torusCenter = models[0].translate;
			// Number of spheres placed on the path.
			var n = Math.max(1, sphereCounter);

			// Use model-specific path params when available.
			var path = model.path || {};
			var r = (typeof path.radius === 'number') ? path.radius : circleRadius;

			// Compute rotation matrix from azimuth (around Y) and elevation (around X)
			var R = mat4.create();
			mat4.identity(R);
			if (path.azimuth) mat4.rotateY(R, R, path.azimuth);
			if (path.elevation) mat4.rotateX(R, R, path.elevation);

			// Determine the base direction for angle 0. If caller supplied
			// `path.direction` (a vec3), use it as the direction from the
			// torus center to the point at angle 0. Otherwise fall back to X.
			var u = vec3.fromValues(1, 0, 0);
			if (path.direction && path.direction.length === 3) {
				u = vec3.fromValues(path.direction[0], path.direction[1], path.direction[2]);
			}
			// Apply azimuth/elevation rotation to the chosen base vector.
			vec3.transformMat4(u, u, R);
			// Normalize direction.
			vec3.normalize(u, u);

			// Build an orthonormal basis (u, v) for the circle plane. Choose
			// a temporary 'up' vector that is not parallel to u.
			var up = vec3.fromValues(0, 1, 0);
			if (Math.abs(vec3.dot(up, u)) > 0.9) up = vec3.fromValues(1, 0, 0);
			var w = vec3.create();
			vec3.cross(w, up, u);
			vec3.normalize(w, w);
			// v is a second in-plane orthonormal vector (perp to u and w).
			var v = vec3.create();
			vec3.cross(v, u, w);
			vec3.normalize(v, v);

			// Decide phase for this sphere: explicit phase or even spacing
			// Decide phase for this sphere: use explicit `path.phase` when
			// provided, otherwise distribute spheres evenly and add PI so the
			// initial position is the point farthest from the torus center.
			var basePhase;
			if (typeof path.phase === 'number') {
				basePhase = path.phase;
			} else {
				basePhase = model.sphereIndex * 2.0 * Math.PI / n + Math.PI;
			}
			var a = ((typeof path.angle === 'number') ? path.angle : circleAngle) + basePhase;

			// Circle center is chosen so the point at angle 0 equals torusCenter:
			// circleCenter = torusCenter - r * u
			var circleCenter = [torusCenter[0] - r * u[0], torusCenter[1] - r * u[1], torusCenter[2] - r * u[2]];

			// Position on circle: circleCenter + r*(u*cos(a) + v*sin(a))
			var pos = [
				circleCenter[0] + r * (u[0] * Math.cos(a) + v[0] * Math.sin(a)),
				circleCenter[1] + r * (u[1] * Math.cos(a) + v[1] * Math.sin(a)),
				circleCenter[2] + r * (u[2] * Math.cos(a) + v[2] * Math.sin(a))
			];
			mat4.translate(mMatrix, mMatrix, pos);
		} else {
			mat4.translate(mMatrix, mMatrix, model.translate);
		}
		mat4.rotateX(mMatrix, mMatrix, model.rotate[0]);
		mat4.rotateY(mMatrix, mMatrix, model.rotate[1]);
		mat4.rotateZ(mMatrix, mMatrix, model.rotate[2]);
		mat4.scale(mMatrix, mMatrix, model.scale);


		// MV = V * M
		mat4.multiply(mvMatrix, camera.vMatrix, mMatrix);


	}

	function draw(model) {
		// Setup position VBO.
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
		gl.vertexAttribPointer(prog.positionAttrib, 3, gl.FLOAT, false,
			0, 0);

		// Setup normal VBO.
		gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
		gl.vertexAttribPointer(prog.normalAttrib, 3, gl.FLOAT, false, 0, 0);

		// Setup rendering tris.
		var fill = (model.fillstyle.search(/fill/) != -1);
		if (fill) {
			gl.enableVertexAttribArray(prog.normalAttrib);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
			gl.drawElements(gl.TRIANGLES, model.iboTris.numberOfElements,
				gl.UNSIGNED_SHORT, 0);
		}

		// Setup rendering lines.
		var wireframe = (model.fillstyle.search(/wireframe/) != -1);
		if (wireframe) {
			gl.disableVertexAttribArray(prog.normalAttrib);
			gl.vertexAttrib3f(prog.normalAttrib, 0, 0, 0);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
			gl.drawElements(gl.LINES, model.iboLines.numberOfElements,
				gl.UNSIGNED_SHORT, 0);
		}
	}

	// App interface.
	return {
		start: start
	}

}());