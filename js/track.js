import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTrack(scene, world) {
    // Suelo
    const groundMat = new CANNON.Material();
    const groundBody = new CANNON.Body({ mass: 0, material: groundMat });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    const texture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/grid.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(100, 100);

    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000),
        new THREE.MeshStandardMaterial({ map: texture })
    );
    plane.rotation.x = -Math.PI / 2;
    scene.add(plane);

    // Muros aleatorios
    const boxGeo = new THREE.BoxGeometry(2, 2, 2);
    const boxMat = new THREE.MeshNormalMaterial();
    
    for(let i=0; i<30; i++) {
        const x = (Math.random()-0.5) * 200;
        const z = (Math.random()-0.5) * 200;
        if(Math.abs(x) < 10 && Math.abs(z) < 10) continue; // No spawnear en el centro
        
        const b = new THREE.Mesh(boxGeo, boxMat);
        b.position.set(x, 1, z);
        scene.add(b);
        
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(new CANNON.Box(new CANNON.Vec3(1,1,1)));
        body.position.set(x, 1, z);
        world.addBody(body);
    }
}