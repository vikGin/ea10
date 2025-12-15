var app = (function () {

    var gl;

    // The shader program object is also used to
    // store attribute and uniform locations.
    var prog;

    // Toon shader program
    var toonProg;

    // Flag to toggle between normal and toon shading
    var useToonShader = false;

    // Toon Vertex Shader Source Code
    var toonVertexShaderSource = `
        attribute vec3 aPosition;
        attribute vec3 aNormal;
        
        uniform mat4 uPMatrix;
        uniform mat4 uMVMatrix;
        uniform mat3 uNMatrix;
        
        // Varyings for fragment shader
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main(){
            // Calculate vertex position in eye coordinates. 
            vec4 tPosition = uMVMatrix * vec4(aPosition, 1.0);
            // Calculate projektion.
            gl_Position = uPMatrix * tPosition;
        
            // Pass normal and position to fragment shader
            vNormal = normalize(uNMatrix * aNormal);
            vPosition = tPosition.xyz;
        }
    `;

    // Toon Fragment Shader Source Code
    var toonFragmentShaderSource = `
        precision mediump float;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        // Ambient light.
        uniform vec3 ambientLight;
        
        // Pointlights.
        const int MAX_LIGHT_SOURCES = 8;
        struct LightSource {
            bool isOn;
            vec3 position;
            vec3 color;
        };
        uniform LightSource light[MAX_LIGHT_SOURCES];
        
        // Material.
        struct PhongMaterial {
            vec3 ka;
            vec3 kd;
            vec3 ks;
            float ke; 
        };
        uniform PhongMaterial material;
        
        // Toon shading parameters
        const float diffuseThreshold = 0.2;
        const float specularThreshold = 0.5;
        const float outlineThreshold = 0.15;  // Dezentere Umrandung
        const int toonLevels = 4;
        
        // Quantize value to discrete levels for toon effect
        float quantize(float value, int levels) {
            return floor(value * float(levels)) / float(levels);
        }
        
        void main() {
            vec3 n = normalize(vNormal);
            vec3 v = normalize(-vPosition);
            
            // Start with ambient
            vec3 color = material.ka * ambientLight;
            
            // Check for silhouette/outline (edge detection)
            float edgeFactor = dot(v, n);
            if (edgeFactor < outlineThreshold) {
                // Subtle dark outline for silhouette edges (not pure black)
                gl_FragColor = vec4(0.1, 0.1, 0.1, 1.0);
                return;
            }
            
            // Process each light source
            for(int j = 0; j < MAX_LIGHT_SOURCES; j++) {
                if(light[j].isOn) {
                    vec3 L = light[j].color;
                    vec3 s = normalize(light[j].position - vPosition);
                    vec3 r = reflect(-s, n);
                    
                    // Diffuse calculation with quantization
                    float diffuseIntensity = max(dot(s, n), 0.0);
                    // Quantize to create discrete bands
                    float toonDiffuse = quantize(diffuseIntensity, toonLevels);
                    
                    // Apply diffuse threshold
                    if (diffuseIntensity >= diffuseThreshold) {
                        color += material.kd * L * toonDiffuse;
                    } else {
                        // Unlit color (darker version)
                        color += material.kd * L * 0.2;
                    }
                    
                    // Specular highlight - hard edge (on/off)
                    float specularIntensity = pow(max(dot(r, v), 0.0), material.ke);
                    if (specularIntensity > specularThreshold) {
                        // Add specular highlight as a solid color
                        color += material.ks * L;
                    }
                }
            }
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    // Array of model objects.
    var models = [];

    // Model that is target for user input.
    var interactiveModel;

    var camera = {
        // Initial position of the camera.
        eye: [0, 5, 4],
        // Point to look at.
        center: [0, 0, 0],
        // Roll and pitch of the camera.
        up: [0, 3, 0],
        // Opening angle given in radian.
        // radian = degree*2*PI/360.
        fovy: 40.0 * Math.PI / 180,
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
        zAngle: 20 * Math.PI / 180,
        // Distance in XZ-Plane from center when orbiting.
        distance: 6,
    };

    // Objekt with light sources characteristics in the scene.
    var illumination = {
        ambientLight: [.5, .5, .5],
        light: [{
            isOn: true,
            position: [3., 1., 3.],
            color: [1., 1., 1.]
        }, {
            isOn: true,
            position: [-3., 1., -3.],
            color: [1., 1., 1.]
        },

        ]
    };

    // Lichtrotation Parameter
    var lightRotation = {
        angle: Math.PI / 4,    // Aktueller Winkel der Rotation (startet bei 45° passend zur Initialposition)
        radius: Math.sqrt(18), // Radius der Kreisbahn (sqrt(3² + 3²) = sqrt(18) ≈ 4.24)
        height: 1,             // Höhe der Lichter
        isAnimating: false,    // Ob die Animation läuft
        animationId: null      // ID für requestAnimationFrame
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
     * Init pipeline parmters that will not change again. If projection or
     * viewport change, thier setup must be in render function.
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

        // Init toon shaders from source strings.
        var toonVs = initShaderFromSource(gl.VERTEX_SHADER, toonVertexShaderSource, "toonVertexShader");
        var toonFs = initShaderFromSource(gl.FRAGMENT_SHADER, toonFragmentShaderSource, "toonFragmentShader");
        // Link toon shader program.
        toonProg = gl.createProgram();
        gl.attachShader(toonProg, toonVs);
        gl.attachShader(toonProg, toonFs);
        gl.bindAttribLocation(toonProg, 0, "aPosition");
        gl.linkProgram(toonProg);
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

    /**
     * Create and init shader from source string.
     * 
     * @parameter shaderType: openGL shader type.
     * @parameter shaderSource: shader source code as string.
     * @parameter shaderName: name for error logging.
     * @returns shader object.
     */
    function initShaderFromSource(shaderType, shaderSource, shaderName) {
        var shader = gl.createShader(shaderType);
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log(shaderName + ": " + gl.getShaderInfoLog(shader));
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

        // Light.
        prog.ambientLightUniform = gl.getUniformLocation(prog,
            "ambientLight");
        // Array for light sources uniforms.
        prog.lightUniform = [];
        // Loop over light sources.
        for (var j = 0; j < illumination.light.length; j++) {
            var lightNb = "light[" + j + "]";
            // Store one object for every light source.
            var l = {};
            l.isOn = gl.getUniformLocation(prog, lightNb + ".isOn");
            l.position = gl.getUniformLocation(prog, lightNb + ".position");
            l.color = gl.getUniformLocation(prog, lightNb + ".color");
            prog.lightUniform[j] = l;
        }

        // Material.
        prog.materialKaUniform = gl.getUniformLocation(prog, "material.ka");
        prog.materialKdUniform = gl.getUniformLocation(prog, "material.kd");
        prog.materialKsUniform = gl.getUniformLocation(prog, "material.ks");
        prog.materialKeUniform = gl.getUniformLocation(prog, "material.ke");

        // Initialize toon shader uniforms
        initToonUniforms();
    }

    function initToonUniforms() {
        // Projection Matrix.
        toonProg.pMatrixUniform = gl.getUniformLocation(toonProg, "uPMatrix");

        // Model-View-Matrix.
        toonProg.mvMatrixUniform = gl.getUniformLocation(toonProg, "uMVMatrix");

        // Normal Matrix.
        toonProg.nMatrixUniform = gl.getUniformLocation(toonProg, "uNMatrix");

        // Light.
        toonProg.ambientLightUniform = gl.getUniformLocation(toonProg, "ambientLight");
        // Array for light sources uniforms.
        toonProg.lightUniform = [];
        // Loop over light sources.
        for (var j = 0; j < illumination.light.length; j++) {
            var lightNb = "light[" + j + "]";
            // Store one object for every light source.
            var l = {};
            l.isOn = gl.getUniformLocation(toonProg, lightNb + ".isOn");
            l.position = gl.getUniformLocation(toonProg, lightNb + ".position");
            l.color = gl.getUniformLocation(toonProg, lightNb + ".color");
            toonProg.lightUniform[j] = l;
        }

        // Material.
        toonProg.materialKaUniform = gl.getUniformLocation(toonProg, "material.ka");
        toonProg.materialKdUniform = gl.getUniformLocation(toonProg, "material.kd");
        toonProg.materialKsUniform = gl.getUniformLocation(toonProg, "material.ks");
        toonProg.materialKeUniform = gl.getUniformLocation(toonProg, "material.ke");

        // Position attribute
        toonProg.positionAttrib = gl.getAttribLocation(toonProg, 'aPosition');
        toonProg.normalAttrib = gl.getAttribLocation(toonProg, 'aNormal');
    }

    /**
     * @paramter material : objekt with optional ka, kd, ks, ke.
     * @retrun material : objekt with ka, kd, ks, ke.
     */
    function createPhongMaterial(material) {
        material = material || {};
        // Set some default values,
        // if not defined in material paramter.
        material.ka = material.ka || [0.3, 0.3, 0.3];
        material.kd = material.kd || [0.6, 0.6, 0.6];
        material.ks = material.ks || [0.8, 0.8, 0.8];
        material.ke = material.ke || 10.;

        return material;
    }

    function initModels() {
        // fillstyle
        var fs = "fill";

        // Create some default material.
        var mDefault = createPhongMaterial();
        var mRed = createPhongMaterial({ kd: [1., 0., 0.] });
        var mGreen = createPhongMaterial({ kd: [0., 1., 0.] });
        var mBlue = createPhongMaterial({ kd: [0., 0., 1.] });
        var mWhite = createPhongMaterial({
            ka: [1., 1., 1.], kd: [.5, .5, .5],
            ks: [0., 0., 0.]
        });

        createModel("torus", fs, [1, 3, 1, 1], [0, 1, 0.1],
            [0, 0, 0, 0], [1.5, 1.5, 1, .1], mWhite);
        createModel("cylinder", fs, [1, 1, 1, 1], [-1.4, .5, 0.2], [0, 0,
            0, 0], [.5, .5, .5], mGreen);
        createModel("cylinder", fs, [1, 1, 1, 1], [1.4, .5, -0.3], [0, 0,
            0, 0], [.5, .5, .5], mBlue);
        createModel("sphere", fs, [1, 1, 1, 1], [0, 1, 0.1], [0, 0,
            0, 0], [.5, .5, .5], mDefault);
        createModel("plane", fs, [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0,
            0], [1, 1, 1, 1], mRed);

        // Select one model that can be manipulated interactively by user.
        interactiveModel = models[0];
    }

    /**
     * Create model object, fill it and push it in models array.
     * 
     * @parameter geometryname: string with name of geometry.
     * @parameter fillstyle: wireframe, fill, fillwireframe.
     */
    function createModel(geometryname, fillstyle, color, translate, rotate,
        scale, material) {
        var model = {};
        model.fillstyle = fillstyle;
        model.color = color;
        initDataAndBuffers(model, geometryname);
        initTransformations(model, translate, rotate, scale);
        model.material = material;

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
        // Rotation step for models.
        var deltaRotate = Math.PI / 36;
        var deltaTranslate = 0.05;
        var deltaScale = 0.05;

        window.onkeydown = function (evt) {
            var key = evt.which ? evt.which : evt.keyCode;
            var c = String.fromCharCode(key);
            // console.log(evt);
            // Use shift key to change sign.
            var sign = evt.shiftKey ? -1 : 1;
            // Rotate interactiveModel.
            switch (c) {
                case ('X'):
                    interactiveModel.rotate[0] += sign * deltaRotate;
                    break;
                case ('Y'):
                    interactiveModel.rotate[1] += sign * deltaRotate;
                    break;
                case ('Z'):
                    interactiveModel.rotate[2] += sign * deltaRotate;
                    break;
            }
            // Scale/squeese interactiveModel.
            switch (c) {
                case ('S'):
                    interactiveModel.scale[0] *= 1 + sign * deltaScale;
                    interactiveModel.scale[1] *= 1 - sign * deltaScale;
                    interactiveModel.scale[2] *= 1 + sign * deltaScale;
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
            // Camera move and orbit.
            switch (c) {
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
                case ('L'):
                    // Step light rotation by one frame.
                    stepLightRotation();
                    break;
                case ('T'):
                    // Toggle toon/cell shader.
                    useToonShader = !useToonShader;
                    console.log("Toon shader: " + (useToonShader ? "ON" : "OFF"));
                    break;
            }
            // Render the scene again on any key pressed.
            render();
        };
    }

    /**
     * Step the light rotation by one frame.
     */
    function stepLightRotation() {
        // Erhöhe den Winkel für die Rotation
        lightRotation.angle += 0.02;

        // Berechne die neuen Positionen der Lichter
        // Licht 1: Position auf der Kreisbahn
        illumination.light[0].position[0] = lightRotation.radius * Math.sin(lightRotation.angle);
        illumination.light[0].position[1] = lightRotation.height;
        illumination.light[0].position[2] = lightRotation.radius * Math.cos(lightRotation.angle);

        // Licht 2: Gegenüberliegende Position (180° versetzt)
        illumination.light[1].position[0] = lightRotation.radius * Math.sin(lightRotation.angle + Math.PI);
        illumination.light[1].position[1] = lightRotation.height;
        illumination.light[1].position[2] = lightRotation.radius * Math.cos(lightRotation.angle + Math.PI);
    }

    /**
     * Toggle the light rotation animation on/off.
     */
    function toggleLightRotation() {
        lightRotation.isAnimating = !lightRotation.isAnimating;
        if (lightRotation.isAnimating) {
            animateLights();
        } else if (lightRotation.animationId) {
            cancelAnimationFrame(lightRotation.animationId);
            lightRotation.animationId = null;
        }
    }

    /**
     * Animate the lights rotating around the scene.
     */
    function animateLights() {
        if (!lightRotation.isAnimating) return;

        // Erhöhe den Winkel für die Rotation
        lightRotation.angle += 0.02;

        // Berechne die neuen Positionen der Lichter
        // Licht 1: Position auf der Kreisbahn
        illumination.light[0].position[0] = lightRotation.radius * Math.sin(lightRotation.angle);
        illumination.light[0].position[1] = lightRotation.height;
        illumination.light[0].position[2] = lightRotation.radius * Math.cos(lightRotation.angle);

        // Licht 2: Gegenüberliegende Position (180° versetzt)
        illumination.light[1].position[0] = lightRotation.radius * Math.sin(lightRotation.angle + Math.PI);
        illumination.light[1].position[1] = lightRotation.height;
        illumination.light[1].position[2] = lightRotation.radius * Math.cos(lightRotation.angle + Math.PI);

        // Szene neu rendern
        render();

        // Nächsten Animationsframe anfordern
        lightRotation.animationId = requestAnimationFrame(animateLights);
    }

    /**
     * Run the rendering pipeline.
     */
    function render() {
        // Clear framebuffer and depth-/z-buffer.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Select shader program based on toon shader state
        var currentProg = useToonShader ? toonProg : prog;
        gl.useProgram(currentProg);

        setProjection(currentProg);

        calculateCameraOrbit();

        // Set view matrix depending on camera.
        mat4.lookAt(camera.vMatrix, camera.eye, camera.center, camera.up);

        // Select shader program based on toon shader state
        var currentProg = useToonShader ? toonProg : prog;

        // NEW
        // Set light uniforms.
        gl.uniform3fv(currentProg.ambientLightUniform, illumination.ambientLight);
        // Loop over light sources.
        for (var j = 0; j < illumination.light.length; j++) {
            // bool is transferred as integer.
            gl.uniform1i(currentProg.lightUniform[j].isOn,
                illumination.light[j].isOn);
            // Tranform light postion in eye coordinates.
            // Copy current light position into a new array.
            var lightPos = [].concat(illumination.light[j].position);
            // Add homogenious coordinate for transformation.
            lightPos.push(1.0);
            vec4.transformMat4(lightPos, lightPos, camera.vMatrix);
            // Remove homogenious coordinate.
            lightPos.pop();
            gl.uniform3fv(currentProg.lightUniform[j].position, lightPos);
            gl.uniform3fv(currentProg.lightUniform[j].color,
                illumination.light[j].color);
        }

        // Loop over models.
        for (var i = 0; i < models.length; i++) {
            // Update modelview for model.
            updateTransformations(models[i]);

            // Set uniforms for model.
            //
            // Transformation matrices.
            gl.uniformMatrix4fv(currentProg.mvMatrixUniform, false,
                models[i].mvMatrix);
            gl.uniformMatrix3fv(currentProg.nMatrixUniform, false,
                models[i].nMatrix);
            // Color (not used with lights).
            if (currentProg.colorUniform) {
                gl.uniform4fv(currentProg.colorUniform, models[i].color);
            }
            // NEW
            // Material.
            gl.uniform3fv(currentProg.materialKaUniform, models[i].material.ka);
            gl.uniform3fv(currentProg.materialKdUniform, models[i].material.kd);
            gl.uniform3fv(currentProg.materialKsUniform, models[i].material.ks);
            gl.uniform1f(currentProg.materialKeUniform, models[i].material.ke);

            draw(models[i], currentProg);
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

    function setProjection(currentProg) {
        // Set projection Matrix.
        switch (camera.projectionType) {
            case ("ortho"):
                var v = camera.lrtb;
                mat4.ortho(camera.pMatrix, -v, v, -v, v, -10, 100);
                break;
            case ("frustum"):
                var v = camera.lrtb;
                mat4.frustum(camera.pMatrix, -v / 2, v / 2, -v / 2, v / 2,
                    1, 10);
                break;
            case ("perspective"):
                mat4.perspective(camera.pMatrix, camera.fovy, camera.aspect, 1,
                    10);
                break;
        }
        // Set projection uniform.
        gl.uniformMatrix4fv(currentProg.pMatrixUniform, false, camera.pMatrix);
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

    function draw(model, currentProg) {
        // Setup position VBO.
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboPos);
        gl.enableVertexAttribArray(currentProg.positionAttrib);
        gl.vertexAttribPointer(currentProg.positionAttrib, 3, gl.FLOAT,
            false, 0, 0);

        // Setup normal VBO.
        gl.bindBuffer(gl.ARRAY_BUFFER, model.vboNormal);
        gl.vertexAttribPointer(currentProg.normalAttrib, 3, gl.FLOAT, false, 0, 0);

        // Setup rendering tris.
        var fill = (model.fillstyle.search(/fill/) != -1);
        if (fill) {
            gl.enableVertexAttribArray(currentProg.normalAttrib);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboTris);
            gl.drawElements(gl.TRIANGLES, model.iboTris.numberOfElements,
                gl.UNSIGNED_SHORT, 0);
        }

        // Setup rendering lines.
        var wireframe = (model.fillstyle.search(/wireframe/) != -1);
        if (wireframe) {
            if (currentProg.colorUniform) {
                gl.uniform4fv(currentProg.colorUniform, [0., 0., 0., 1.]);
            }
            gl.disableVertexAttribArray(currentProg.normalAttrib);
            gl.vertexAttrib3f(currentProg.normalAttrib, 0, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboLines);
            gl.drawElements(gl.LINES, model.iboLines.numberOfElements,
                gl.UNSIGNED_SHORT, 0);
        }
    }

    // App interface.
    return {
        start: start
    };

}());