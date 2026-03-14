const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const loader = document.getElementById('loader');

// Colors matching the styling requests
const COLORS = {
    flesh: 0xf1c27d,
    green: 0x81c784, // Green shirt matching the boy image
    teal: 0x4dd0e1,  // Teal shorts mapped closely to the boy image
    black: 0x222222, // Shoes
    white: 0xffffff
};

// ==========================================
// THREE.JS SETUP
// ==========================================
const threeContainer = document.getElementById('threejs_container');
const scene = new THREE.Scene();

// Add some fog for depth
scene.fog = new THREE.FogExp2(0x111317, 0.2);

const camera = new THREE.PerspectiveCamera(45, threeContainer.clientWidth / threeContainer.clientHeight, 0.1, 100);
// Move camera closer and a bit lower so the character fills more of the screen
camera.position.set(0, 0.5, 2.5); 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(threeContainer.clientWidth, threeContainer.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
threeContainer.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(0, 5, 5);
scene.add(dirLight);

// Removed Grid Helper as requested

// 3D Character construction
const joints = {}; // Stores the spheres
const bones = {};  // Stores the connecting cylinders

const matFlesh = new THREE.MeshStandardMaterial({ color: COLORS.flesh, roughness: 0.4 });
const matGreen = new THREE.MeshStandardMaterial({ color: COLORS.green, roughness: 0.6 });
const matTeal = new THREE.MeshStandardMaterial({ color: COLORS.teal, roughness: 0.6 });
const matBlack = new THREE.MeshStandardMaterial({ color: COLORS.black, roughness: 0.8 });

// Joint map (MediaPipe Landmark Index) - Increased radii for a chunkier, better looking character
const jointMap = [
    { index: 0, rad: 0.25, mat: matFlesh }, // Head (larger)
    { index: 11, rad: 0.10, mat: matGreen }, // L Shoulder
    { index: 12, rad: 0.10, mat: matGreen }, // R Shoulder
    { index: 13, rad: 0.08, mat: matFlesh }, // L Elbow
    { index: 14, rad: 0.08, mat: matFlesh }, // R Elbow
    { index: 15, rad: 0.07, mat: matFlesh }, // L Wrist
    { index: 16, rad: 0.07, mat: matFlesh }, // R Wrist
    { index: 23, rad: 0.11, mat: matTeal }, // L Hip
    { index: 24, rad: 0.11, mat: matTeal }, // R Hip
    { index: 25, rad: 0.09, mat: matFlesh }, // L Knee
    { index: 26, rad: 0.09, mat: matFlesh }, // R Knee
    { index: 27, rad: 0.08, mat: matBlack }, // L Ankle
    { index: 28, rad: 0.08, mat: matBlack }, // R Ankle
    { index: 31, rad: 0.10, mat: matBlack }, // L Foot
    { index: 32, rad: 0.10, mat: matBlack }  // R Foot
];

// Create joint spheres
jointMap.forEach(j => {
    const geo = new THREE.SphereGeometry(j.rad, 16, 16);
    const mesh = new THREE.Mesh(geo, j.mat);
    scene.add(mesh);
    joints[j.index] = mesh;
    
    // Custom face details for the head (index 0)
    if (j.index === 0) {
        // Black hair hemisphere
        const hairGeo = new THREE.SphereGeometry(j.rad + 0.015, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7);
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1.0 });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 0.02;
        hair.rotation.x = -0.15; // tilt backwards slightly
        mesh.add(hair);
        
        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.045, 16, 16);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const pupilGeo = new THREE.SphereGeometry(0.025, 16, 16);
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.1, 0.06, j.rad * 0.85);
        const rightEye = leftEye.clone();
        rightEye.position.set(0.1, 0.06, j.rad * 0.85);
        
        const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
        pupilL.position.set(0, 0, 0.035);
        leftEye.add(pupilL);
        const pupilR = leftEye.children[0].clone();
        rightEye.add(pupilR);
        
        mesh.add(leftEye);
        mesh.add(rightEye);
    }
});

// Define bones (connections between joints) - Increased radii
const boneDefs = [
    // Torso (Green)
    { id: 'shoulder_l_r', p1: 11, p2: 12, mat: matGreen, rad: 0.10 },
    { id: 'hip_l_r', p1: 23, p2: 24, mat: matTeal, rad: 0.11 },
    { id: 'torso_l', p1: 11, p2: 23, mat: matGreen, rad: 0.105 },
    { id: 'torso_r', p1: 12, p2: 24, mat: matGreen, rad: 0.105 },
    { id: 'torso_mid', p1: 11, p2: 24, mat: matGreen, rad: 0.105 }, // Cross for solid body
    { id: 'torso_mid2', p1: 12, p2: 23, mat: matGreen, rad: 0.105 }, // Cross for solid body
    
    // Arms
    { id: 'arm_u_l', p1: 11, p2: 13, mat: matGreen, rad: 0.085 }, // Short sleeves (Green)
    { id: 'arm_u_r', p1: 12, p2: 14, mat: matGreen, rad: 0.085 }, // Short sleeves (Green)
    { id: 'arm_l_l', p1: 13, p2: 15, mat: matFlesh, rad: 0.07 }, // Forearm (Flesh)
    { id: 'arm_l_r', p1: 14, p2: 16, mat: matFlesh, rad: 0.07 }, // Forearm (Flesh)

    // Legs
    { id: 'leg_u_l', p1: 23, p2: 25, mat: matTeal, rad: 0.10 }, // Shorts (Teal)
    { id: 'leg_u_r', p1: 24, p2: 26, mat: matTeal, rad: 0.10 }, // Shorts (Teal)
    { id: 'leg_l_l', p1: 25, p2: 27, mat: matFlesh, rad: 0.08 }, // Lower leg (Flesh)
    { id: 'leg_l_r', p1: 26, p2: 28, mat: matFlesh, rad: 0.08 }, // Lower leg (Flesh)

    // Feet
    { id: 'foot_l', p1: 27, p2: 31, mat: matBlack, rad: 0.08 }, // Shoe
    { id: 'foot_r', p1: 28, p2: 32, mat: matBlack, rad: 0.08 }  // Shoe
];

// Create bone cylinders
// A default cylinder has height 1 along Y axis
// We will apply scale.y = distance, and rotate to face the right direction
const baseCylGeo = new THREE.CylinderGeometry(1, 1, 1, 8); 
// Displace origin to the bottom of the cylinder for easier pivoting? 
// No, center origin is fine for position calculation (midpoint).

boneDefs.forEach(b => {
    // Clone geometry so we can scale radii individually without affecting others
    const geo = baseCylGeo.clone(); 
    geo.scale(b.rad, 1, b.rad); // Scale base radius
    const mesh = new THREE.Mesh(geo, b.mat);
    scene.add(mesh);
    bones[b.id] = mesh;
});
// Create a neck manually
const neckGeo = baseCylGeo.clone();
neckGeo.scale(0.06, 1, 0.06);
const neckMesh = new THREE.Mesh(neckGeo, matFlesh);
scene.add(neckMesh);
bones['neck'] = neckMesh;


// Window resize listener
window.addEventListener('resize', () => {
    const width = threeContainer.clientWidth;
    const height = threeContainer.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    // Also update 2d canvas
    canvasElement.width = videoElement.clientWidth;
    canvasElement.height = videoElement.clientHeight;
});

function draw3DCharacter(landmarks) {
    if (!landmarks) return;

    // We use landmarks to get raw 3D positions
    // MediaPipe World Landmarks:
    // Origin at hip center. Coordinates are in meters.
    // X goes right, Y goes DOWN (in MP) -> Thus we negate Y to fit Three.js where Y is UP.
    // Z goes forward. Inverse it to push depth correctly? MediaPipe Z depth goes away from camera.
    // Typically: For Three.js, facing camera means -Z is forward. So MediaPipe Z usually works inverted.

    const vecMap = {};
    
    // 0. Store all vector representations
    landmarks.forEach((lm, index) => {
        vecMap[index] = new THREE.Vector3(-lm.x, -lm.y, -lm.z);
    });
    
    // 1. Update joints
    jointMap.forEach(j => {
        const lm = landmarks[j.index];
        if (lm) {
            // Smooth out visibility threshold
            const vis = lm.visibility || 1.0;
            joints[j.index].visible = vis > 0.5;
            joints[j.index].position.copy(vecMap[j.index]);
        }
    });

    // Compute Face Rotation
    const nose = vecMap[0];
    const earL = vecMap[7]; // Left ear
    const earR = vecMap[8]; // Right ear
    if (nose && earL && earR && joints[0].visible) {
        // Since we mirrored X, the anatomical left ear (-lm.x) is on the right visually if facing us
        // So earR to earL vector is essentially our right axis
        const rightVec = earR.clone().sub(earL).normalize(); 
        const midEar = earL.clone().add(earR).multiplyScalar(0.5);
        
        let forwardVec = nose.clone().sub(midEar).normalize();
        const upVec = new THREE.Vector3().crossVectors(rightVec, forwardVec).normalize();
        forwardVec = new THREE.Vector3().crossVectors(upVec, rightVec).normalize();
        
        const mat = new THREE.Matrix4().makeBasis(rightVec, upVec, forwardVec);
        joints[0].quaternion.setFromRotationMatrix(mat);
    }

    // 2. Update Bones
    boneDefs.forEach(b => {
        const v1 = vecMap[b.p1];
        const v2 = vecMap[b.p2];
        const boneMesh = bones[b.id];
        
        if (v1 && v2 && joints[b.p1].visible && joints[b.p2].visible) {
            boneMesh.visible = true;
            
            // Distance
            const dist = v1.distanceTo(v2);
            // Midpoint
            const mid = v1.clone().add(v2).multiplyScalar(0.5);
            // Direction Vector
            const dir = v2.clone().sub(v1).normalize();
            
            boneMesh.position.copy(mid);
            // Cylinder Y is default height, so we scale Y to dist
            boneMesh.scale.set(1, dist, 1);
            
            // Align cylinder's UP vector (0,1,0) to 'dir'
            const up = new THREE.Vector3(0, 1, 0);
            boneMesh.quaternion.setFromUnitVectors(up, dir);
        } else {
            boneMesh.visible = false;
        }
    });

    // Handle Neck (midpoint of shoulders to Head)
    if (vecMap[0] && vecMap[11] && vecMap[12]) {
        neckMesh.visible = joints[0].visible;
        const chestMid = vecMap[11].clone().add(vecMap[12]).multiplyScalar(0.5);
        const head = vecMap[0];
        const dist = chestMid.distanceTo(head);
        const mid = chestMid.clone().add(head).multiplyScalar(0.5);
        const dir = head.clone().sub(chestMid).normalize();
        
        neckMesh.position.copy(mid);
        neckMesh.scale.set(1, dist, 1);
        neckMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    }
}

// Render loop for Three.js
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();


// ==========================================
// MEDIAPIPE SETUP
// ==========================================

// Custom face connections to match the screenshot (eyes, nose, mouth)
const CUSTOM_FACE_CONNECTIONS = [
    [1, 2], [2, 3], [3, 7], // Right Eye
    [4, 5], [5, 6], [6, 8], // Left Eye
    [9, 10] // Mouth line
];
function onResults(results) {
    if (loader.style.opacity !== '0') {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }

    // Match internal canvas resolution to actual video resolution
    if (canvasElement.width !== videoElement.videoWidth || canvasElement.height !== videoElement.videoHeight) {
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
        }
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Only draw the overlay
    if (results.poseLandmarks) {
        // Draw 2D Skeleton based on image 1/2 styling
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
            color: '#00f2fe',
            lineWidth: 4
        });
        drawLandmarks(canvasCtx, results.poseLandmarks, {
            color: '#ffffff',
            lineWidth: 2,
            fillColor: '#00f2fe',
            radius: 5
        });
        
        // Also draw face landmarks if we want to match the screenshot precisely
        drawConnectors(canvasCtx, results.poseLandmarks, CUSTOM_FACE_CONNECTIONS, {
            color: '#00f2fe',
            lineWidth: 3
        });
    }
    canvasCtx.restore();

    // Trigger 3D Character update using World Landmarks mapping
    if (results.poseWorldLandmarks) {
        draw3DCharacter(results.poseWorldLandmarks);
    }
}

const pose = new Pose({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});

pose.setOptions({
  modelComplexity: 1, // 1 is standard, decent speed/accuracy tradeoff
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

pose.onResults(onResults);

const cameraControl = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({image: videoElement});
  },
  width: 1280,
  height: 720
});
cameraControl.start();
